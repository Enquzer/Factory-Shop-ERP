import { NextRequest, NextResponse } from 'next/server';
import { testTelegramChannel } from '@/lib/telegram-shop-notifications';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * Handle POST /api/telegram/test
 * Tests a Telegram channel by sending a test message
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    
    if (!user || user.role !== 'factory') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { channelId, shopName } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const result = await testTelegramChannel(channelId, shopName);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error testing Telegram channel:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
