import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/marketing-orders/total-produced-all - Get total produced quantity for all orders
export async function GET() {
  try {
    const db = await getDb();
    
    // Try to get the sum with isTotalUpdate condition
    try {
      const result = await db.all(`
        SELECT orderId, SUM(quantity) as totalProduced
        FROM daily_production_status 
        WHERE isTotalUpdate = 1
        GROUP BY orderId
      `);
      
      // Convert to object for easier lookup
      const totals: Record<string, number> = {};
      result.forEach((row: any) => {
        totals[row.orderId] = row.totalProduced || 0;
      });
      
      return NextResponse.json({ totals });
    } catch (error) {
      // If the isTotalUpdate column doesn't exist, fall back to summing all quantities
      console.log('isTotalUpdate column not found, falling back to summing all quantities');
      const result = await db.all(`
        SELECT orderId, SUM(quantity) as totalProduced
        FROM daily_production_status 
        GROUP BY orderId
      `);
      
      // Convert to object for easier lookup
      const totals: Record<string, number> = {};
      result.forEach((row: any) => {
        totals[row.orderId] = row.totalProduced || 0;
      });
      
      return NextResponse.json({ totals });
    }
  } catch (error: any) {
    console.error('Error fetching total produced quantities:', error);
    return NextResponse.json({ error: 'Failed to fetch total produced quantities', details: error.message }, { status: 500 });
  }
}