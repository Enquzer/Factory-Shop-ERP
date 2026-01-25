import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * GET /api/telegram/sync
 * Manually fetches recent updates from Telegram using polling (getUpdates).
 * This works on localhost without needing tunnels or webhooks.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    
    if (!user || user.role !== 'factory') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'No token configured' }, { status: 400 });
    }

    const TelegramBot = (await import('node-telegram-bot-api')).default;
    const bot = new TelegramBot(token, { polling: false });
    
    // 1. First, delete webhook if it exists (getUpdates doesn't work with Webhook active)
    await bot.deleteWebHook();
    console.log('🗑️ Webhook deleted for sync');

    // 2. Fetch recent updates (messages, bot added to group, etc.)
    const updates = await bot.getUpdates({ limit: 100, timeout: 0 });
    console.log(`📥 Fetched ${updates.length} updates from Telegram`);

    const db = await getDb();
    let newGroupsCount = 0;

    for (const update of updates) {
      let chat = null;
      let type = '';

      // Check for bot being added to a group/channel
      if (update.my_chat_member) {
        chat = update.my_chat_member.chat;
        type = chat.type;
      } 
      // Check for messages in a group/channel (if privacy mode is off)
      else if (update.message) {
        chat = update.message.chat;
        type = chat.type;
      }
      // Check for channel posts
      else if (update.channel_post) {
        chat = update.channel_post.chat;
        type = 'channel';
      }

      if (chat && (type === 'group' || type === 'supergroup' || type === 'channel')) {
        const result = await db.run(`
          INSERT INTO telegram_groups (id, title, type, added_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET 
            title = excluded.title,
            type = excluded.type
        `, [chat.id.toString(), chat.title || 'Unknown', type]);
        
        if (result.changes && result.changes > 0) {
          newGroupsCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatesFound: updates.length,
      newGroupsDetected: newGroupsCount,
      message: `Successfully scanned ${updates.length} events from Telegram.`
    });
  } catch (error: any) {
    console.error('Error syncing Telegram updates:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
