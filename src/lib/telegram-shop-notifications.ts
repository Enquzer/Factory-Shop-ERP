import { getDb } from './db';

// Type definitions
export type TelegramMessageType = 'order_placed' | 'payment_verified' | 'order_dispatched';

// Telegram bot instance (lazy loaded)
let TelegramBot: any = null;
let bot: any = null;

// Initialize bot only on server side
const initBot = async () => {
  if (typeof window !== 'undefined') {
    return null;
  }

  if (bot) {
    return bot;
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN not configured');
    return null;
  }

  try {
    // Dynamically import to avoid client-side issues
    TelegramBot = (await import('node-telegram-bot-api')).default;
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    return bot;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    return null;
  }
};

/**
 * Helper to get progress bar based on status
 */
function getProgressBar(messageType: TelegramMessageType) {
  const map: Record<string, number> = { 
    'order_placed': 2, 
    'payment_verified': 6, 
    'order_dispatched': 10 
  };
  const step = map[messageType] || 2;
  return "`[" + "▬".repeat(step) + "▭".repeat(10 - step) + "]`";
}

/**
 * Helper to convert local PDF path to public URL
 */
function pathToUrl(pdfPath: string | null): string | null {
  if (!pdfPath) return null;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  // Telegram requires HTTPS for most things and definitely doesn't accept localhost
  if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    return null;
  }
  
  // Extract filename from path
  const parts = pdfPath.split(/[\/\\]/);
  const fileName = parts[parts.length - 1];
  
  return `${baseUrl}/telegram-pdfs/${fileName}`;
}

/**
 * Send order notification to shop's Telegram channel
 */
export async function sendShopOrderNotification(
  orderId: string,
  shopId: string,
  messageType: TelegramMessageType,
  options: {
    pdfPath?: string;
    imagePath?: string;
    caption?: string;
    additionalText?: string;
  }
): Promise<boolean> {
  // Only run on server side
  if (typeof window !== 'undefined') {
    console.warn('sendShopOrderNotification can only be called on server side');
    return false;
  }

  const envEnabled = process.env.TELEGRAM_ENABLED === 'true';
  const botTokenSet = !!process.env.TELEGRAM_BOT_TOKEN;

  // Check if Telegram is enabled
  if (!envEnabled) {
    const db = await getDb();
    await db.run(`
      INSERT INTO shop_telegram_notifications (
        orderId, shopId, channelId, messageType, status, errorMessage, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [orderId, shopId, 'unknown', messageType, 'disabled', 'TELEGRAM_ENABLED is not true']);
    return false;
  }

  try {
    const db = await getDb();
    
    // Get shop's telegram channel ID
    const shop = await db.get(
      'SELECT telegram_channel_id, name FROM shops WHERE id = ?',
      shopId
    );

    if (!shop || !shop.telegram_channel_id) {
      console.log(`Shop ${shopId} does not have a Telegram channel configured`);
      // Log as skipped, not failed
      await db.run(`
        INSERT INTO shop_telegram_notifications (
          orderId, shopId, channelId, messageType, status, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [orderId, shopId, 'not_configured', messageType, 'skipped']);
      return false;
    }

    const channelId = shop.telegram_channel_id;
    const botInstance = await initBot();

    if (!botInstance) {
      console.error('Telegram bot not initialized');
      return false;
    }

    // Check if we have an existing "anchor" message for this order
    const existingNotifications = await db.all(
      'SELECT id, messageId, messageType, pdfUrl FROM shop_telegram_notifications WHERE orderId = ? AND status = ? AND messageId IS NOT NULL ORDER BY created_at ASC',
      [orderId, 'sent']
    );

    const anchorMessageId = existingNotifications.length > 0 ? existingNotifications[0].messageId : null;

    // Create buttons for ALL PDFs sent for this order so far (including the new one)
    const buttons = [];
    const pdfMap: Record<string, string> = {};
    
    // Add existing PDFs
    existingNotifications.forEach((n: any) => {
      if (n.pdfUrl) pdfMap[n.messageType] = n.pdfUrl;
    });
    
    // Add current PDF
    if (options.pdfPath) pdfMap[messageType] = options.pdfPath;

    let linksAvailable = false;
    
    // Build buttons (LATEST FIRST)
    if (pdfMap['order_dispatched'] || (options.pdfPath && messageType === 'order_dispatched')) {
      const p = pdfMap['order_dispatched'] || options.pdfPath;
      const url = pathToUrl(p || null);
      if (url) {
        buttons.push([{ text: "🚚 FINAL: Full Dispatch Report", url }]);
        linksAvailable = true;
      }
    }
    if (pdfMap['payment_verified'] || (options.pdfPath && messageType === 'payment_verified')) {
      const p = pdfMap['payment_verified'] || options.pdfPath;
      const url = pathToUrl(p || null);
      if (url) {
        buttons.push([{ text: "💳 UPDATED: Payment Proof Sheet", url }]);
        linksAvailable = true;
      }
    }
    if (pdfMap['order_placed']) {
      const url = pathToUrl(pdfMap['order_placed']);
      if (url) {
        buttons.push([{ text: "📄 INITIAL: Order Sheet", url }]);
        linksAvailable = true;
      }
    }

    const localTestingNote = !linksAvailable && process.env.NODE_ENV !== 'production' 
      ? "\n\n⚠️ *Note: Document links unavailable in local testing mode (localhost).* See the attached file for details." 
      : "";

    // Construct common caption
    const statusMap: Record<string, string> = {
      'order_placed': 'Pending Verification',
      'payment_verified': 'Payment Verified - Ready for Dispatch',
      'order_dispatched': 'Dispatched - In Transit'
    };

    const currentStatus = statusMap[messageType] || messageType;
    const progressBar = getProgressBar(messageType);
    
    const caption = `
📦 **ORDER: ${orderId}**
🏪 **Shop:** ${shop.name}
━━━━━━━━━━━━━━━━━━━━
**Status:** ${currentStatus}
${progressBar}${localTestingNote}

${options.caption || ''}

${linksAvailable ? '👇 **Get UPDATED Documents (Full History):**' : '📎 *Document attached below*'} `;

    let messageId: string | undefined;
    let status = 'sent';
    let errorMessage: string | undefined;

    const replyMarkup = buttons.length > 0 ? {
      inline_keyboard: buttons
    } : undefined;

    try {
      // Logic for Anchor Message and Content Delivery
      const isInitialMessage = !anchorMessageId;
      const mustSendNewFile = !linksAvailable && options.pdfPath && !isInitialMessage;

      if (anchorMessageId) {
        // 1. UPDATE the DASHBOARD card (Text & Buttons)
        try {
          await botInstance.editMessageCaption(
            caption,
            {
              chat_id: channelId,
              message_id: parseInt(anchorMessageId),
              parse_mode: 'Markdown',
              reply_markup: replyMarkup
            }
          );
          messageId = anchorMessageId;
          console.log(`Telegram Dashboard card UPDATED for order ${orderId}`);
        } catch (editError: any) {
          console.warn('Failed to edit dashboard card:', editError.message);
        }

        // 2. FOR LOCAL TESTING: If buttons are unavailable, send the NEW cumulative PDF as a separate message
        if (mustSendNewFile) {
           await botInstance.sendDocument(
             channelId,
             options.pdfPath!,
             {
               caption: `🔄 *Updated Document for ${orderId}*\nStatus: ${currentStatus}`,
               parse_mode: 'Markdown'
             }
           );
           console.log(`Sent updated cumulative PDF as new message (Local Mode)`);
        }
      }

      if (!messageId) {
        // INITIAL MESSAGE: Send new dashboard card with PDF
        let message;
        if (options.pdfPath) {
          message = await botInstance.sendDocument(
            channelId,
            options.pdfPath,
            {
              caption: caption,
              parse_mode: 'Markdown',
              reply_markup: replyMarkup
            }
          );
        } else {
          message = await botInstance.sendMessage(
            channelId,
            caption,
            { 
              parse_mode: 'Markdown',
              reply_markup: replyMarkup
            }
          );
        }
        messageId = message.message_id.toString();
        console.log(`Telegram notification sent successfully: ${messageType} for order ${orderId}`);
      }
    } catch (sendError: any) {
      status = 'failed';
      errorMessage = sendError.message;
      console.error('Error sending Telegram message:', sendError);
    }

    // Log the notification
    await db.run(`
      INSERT INTO shop_telegram_notifications (
        orderId, shopId, channelId, messageType, messageId, 
        pdfUrl, imageUrl, status, errorMessage, sentAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      orderId,
      shopId,
      channelId,
      messageType,
      messageId || null,
      options.pdfPath || null,
      options.imagePath || null,
      status,
      errorMessage || null
    ]);

    return status === 'sent';
  } catch (error) {
    console.error('Error in sendShopOrderNotification:', error);
    return false;
  }
}

/**
 * Get notification history for an order
 */
export async function getOrderTelegramHistory(orderId: string) {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side');
  }

  const db = await getDb();
  return await db.all(
    'SELECT * FROM shop_telegram_notifications WHERE orderId = ? ORDER BY created_at DESC',
    orderId
  );
}

/**
 * Get notification history for a shop
 */
export async function getShopTelegramHistory(shopId: string, limit: number = 50) {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server side');
  }

  const db = await getDb();
  return await db.all(
    'SELECT * FROM shop_telegram_notifications WHERE shopId = ? ORDER BY created_at DESC LIMIT ?',
    [shopId, limit]
  );
}

/**
 * Test sending a message to a channel
 */
export async function testTelegramChannel(channelId: string, shopName?: string): Promise<{ success: boolean; error?: string; messageId?: number }> {
  if (typeof window !== 'undefined') {
    return { success: false, error: 'Can only be called on server side' };
  }

  try {
    const botInstance = await initBot();
    
    if (!botInstance) {
      return { success: false, error: 'Bot not initialized' };
    }

    const res = await botInstance.sendMessage(
      channelId,
      `✅ *Test Message${shopName ? ` for ${shopName}` : ''}*\n\nTelegram channel is configured correctly!\n\nYou will receive order notifications here.`,
      { parse_mode: 'Markdown' }
    );

    console.log('✅ Telegram test message sent successfully:', res.message_id);
    return { success: true, messageId: res.message_id };
  } catch (error: any) {
    console.error('❌ Telegram Test Error Details:', {
      errorCode: error.code,
      errorDescription: error.description,
      channelId,
      errorName: error.name,
      errorMessage: error.message
    });
    return { success: false, error: error.description || error.message };
  }
}
