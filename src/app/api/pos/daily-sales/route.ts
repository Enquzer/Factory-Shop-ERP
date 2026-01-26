import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const days = searchParams.get('days') || '7';

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();

    // Get daily sales data
    const dailySales = await db.all(`
      SELECT 
        DATE(createdAt) as date,
        SUM(totalAmount) as sales,
        COUNT(*) as transactions
      FROM pos_sales 
      WHERE shopId = ? 
        AND DATE(createdAt) >= DATE('now', '-${days} days')
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) DESC
    `, [shopId]);

    return NextResponse.json(dailySales);
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    return NextResponse.json({ error: 'Failed to fetch daily sales data' }, { status: 500 });
  }
}