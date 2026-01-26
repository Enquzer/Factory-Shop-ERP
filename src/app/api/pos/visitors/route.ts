import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopId, count = 1, date } = body;

    // Allow negative count for reduction, but strictly check type
    if (!shopId || typeof count !== 'number') {
      return NextResponse.json({ error: 'Invalid shop ID or count' }, { status: 400 });
    }

    const db = await getDb();
    const today = date || new Date().toISOString().split('T')[0];

    // Try to update existing visitor count for the given date
    // Use MAX(0, count + ?) to ensure the count never becomes negative
    await db.run(
      `INSERT INTO pos_visitors (shopId, count, date) 
       VALUES (?, MAX(0, ?), ?)
       ON CONFLICT(shopId, date) 
       DO UPDATE SET count = MAX(0, count + ?)`,
      [shopId, count, today, count]
    );

    // Get the updated total count
    const updatedCount = await db.get(
      `SELECT count FROM pos_visitors WHERE shopId = ? AND date = ?`,
      [shopId, today]
    );

    if (!updatedCount) {
      return NextResponse.json({ error: 'Failed to fetch updated visitor count' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: updatedCount.count });
  } catch (error) {
    console.error('Error updating visitor count:', error);
    return NextResponse.json({ error: 'Failed to update visitor count' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    const today = new Date().toISOString().split('T')[0];
    const requestedDate = searchParams.get('date');
    
    // Get today's visitor count
    const todayVisitors = await db.get(
      `SELECT count FROM pos_visitors WHERE shopId = ? AND date = ?`,
      [shopId, today]
    );

    // Get specific date count if requested
    let dateCount = null;
    if (requestedDate) {
      const requestedVisitors = await db.get(
        `SELECT count FROM pos_visitors WHERE shopId = ? AND date = ?`,
        [shopId, requestedDate]
      );
      dateCount = requestedVisitors?.count || 0;
    }

    // Get visitor data for the last 30 days for graph
    const past30Days = await db.all(
      `SELECT date, count FROM pos_visitors 
       WHERE shopId = ? 
       AND date >= date('now', '-30 days') 
       ORDER BY date DESC`,
      [shopId]
    );

    return NextResponse.json({ 
      today: todayVisitors?.count || 0,
      count: dateCount !== null ? dateCount : (todayVisitors?.count || 0),
      past30Days,
      totalLast30Days: past30Days.reduce((sum: number, day: any) => sum + day.count, 0)
    });
  } catch (error) {
    console.error('Error fetching visitor data:', error);
    return NextResponse.json({ error: 'Failed to fetch visitor data' }, { status: 500 });
  }
}