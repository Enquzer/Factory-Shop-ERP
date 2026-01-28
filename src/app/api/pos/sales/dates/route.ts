import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Get distinct dates that have sales (last 90 days for performance)
    const salesDates = await db.all(
      `SELECT DISTINCT DATE(createdAt) as date 
       FROM pos_sales 
       WHERE shopId = ? 
       AND DATE(createdAt) >= DATE('now', '-90 days')
       ORDER BY date DESC`,
      [shopId]
    );

    // Extract just the date strings
    const dates = salesDates.map((row: any) => row.date);

    return NextResponse.json({ dates });
  } catch (error) {
    console.error('Error fetching sales dates:', error);
    return NextResponse.json({ error: 'Failed to fetch sales dates' }, { status: 500 });
  }
}
