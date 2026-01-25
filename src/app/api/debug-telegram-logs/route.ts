import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM shop_telegram_notifications ORDER BY created_at DESC LIMIT 10');
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
