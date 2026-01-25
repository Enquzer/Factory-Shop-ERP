import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

/**
 * GET /api/telegram/detected-groups
 * Returns a list of groups/channels where the bot has been added
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    
    if (!user || user.role !== 'factory') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDb();
    const groups = await db.all('SELECT * FROM telegram_groups ORDER BY added_at DESC');

    return NextResponse.json({
      success: true,
      groups
    });
  } catch (error: any) {
    console.error('Error fetching detected groups:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
