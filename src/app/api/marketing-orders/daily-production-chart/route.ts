import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/marketing-orders/daily-production-chart?orderId=... - Get daily production data for chart
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Get daily production data aggregated by date
    const dailyData = await db.all(`
      SELECT 
        date,
        SUM(quantity) as totalQuantity
      FROM daily_production_status 
      WHERE orderId = ?
      GROUP BY date
      ORDER BY date ASC
    `, orderId);
    
    // Format the data for the chart
    const chartData = dailyData.map((row: any) => ({
      date: row.date,
      quantity: row.totalQuantity
    }));
    
    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error('Error fetching daily production chart data:', error);
    return NextResponse.json({ error: 'Failed to fetch daily production chart data', details: error.message }, { status: 500 });
  }
}