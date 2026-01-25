import { NextRequest, NextResponse } from 'next/server';
import { testTelegramChannel } from '@/lib/telegram-shop-notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId') || '-1003867704448';
    
    console.log('Testing Telegram channel:', channelId);
    console.log('ENV TELEGRAM_ENABLED:', process.env.TELEGRAM_ENABLED);
    console.log('ENV TELEGRAM_BOT_TOKEN set:', !!process.env.TELEGRAM_BOT_TOKEN);
    
    return NextResponse.json({
      success: true,
      env: {
        TELEGRAM_ENABLED: process.env.TELEGRAM_ENABLED,
        TELEGRAM_BOT_TOKEN_SET: !!process.env.TELEGRAM_BOT_TOKEN
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
