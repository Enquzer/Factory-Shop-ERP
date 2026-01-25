import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Handle GET /api/telegram/webhook
 * Simple health check to verify endpoint is reachable
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    message: 'Telegram Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle POST /api/telegram/webhook
 * Receives updates from Telegram when the bot is added to groups/channels
 */
export async function POST(req: NextRequest) {
  console.log('🏁 WEBHOOK TRIGGERED AT:', new Date().toISOString());
  try {
    const update = await req.json();
    console.log('📬 Update Content:', JSON.stringify(update, null, 2));

    // 1. Listen for bot status changes in chats (added to group/channel)
    if (update.my_chat_member) {
      const chat = update.my_chat_member.chat;
      const status = update.my_chat_member.new_chat_member.status;
      
      // If added as admin or member
      if (['administrator', 'member'].includes(status)) {
        console.log(`✅ Bot detected in ${chat.type}: ${chat.title} (ID: ${chat.id})`);
        
        const db = await getDb();
        await db.run(`
          INSERT INTO telegram_groups (id, title, type, added_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET 
            title = excluded.title,
            type = excluded.type,
            added_at = datetime('now')
        `, [chat.id.toString(), chat.title || 'Unknown', chat.type]);

        // Optional: Send welcome message
        try {
          const TelegramBot = (await import('node-telegram-bot-api')).default;
          const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
          await bot.sendMessage(chat.id, `🚀 *Carement ERP Bot Connected!* \n\nThis group (ID: \`${chat.id}\`) is now available to be linked to your shops in the dashboard.`, { parse_mode: 'Markdown' });
        } catch (msgErr) {
          console.error('Error sending welcome message:', msgErr);
        }
      }
    }

    // 2. Listen for direct messages /getid
    if (update.message && update.message.text === '/getid') {
      try {
        const TelegramBot = (await import('node-telegram-bot-api')).default;
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
        await bot.sendMessage(update.message.chat.id, `📍 *Chat Information*\n\nName: ${update.message.chat.title || 'Private Chat'}\nID: \`${update.message.chat.id}\``, { parse_mode: 'Markdown' });
      } catch (msgErr) {
          console.error('Error responding to /getid:', msgErr);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    // Always return 200 to Telegram so it doesn't retry infinitely on error
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
