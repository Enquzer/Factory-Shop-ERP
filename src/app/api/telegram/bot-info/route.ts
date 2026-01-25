import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * GET /api/telegram/bot-info
 * Returns the information about the bot associated with the current token
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
    
    // Bypass type mismatch with internal User type
    const botInfo = await bot.getMe() as any;

    return NextResponse.json({
      success: true,
      bot: {
        id: botInfo.id,
        first_name: botInfo.first_name,
        username: botInfo.username,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages
      }
    });
  } catch (error: any) {
    console.error('Error fetching bot info:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
