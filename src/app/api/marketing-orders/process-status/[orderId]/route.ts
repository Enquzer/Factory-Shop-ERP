import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/marketing-orders/process-status/:orderId - Get process status summary for an order
export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const db = await getDb();
    
    // Get all daily production statuses for this order grouped by process stage
    const processStatuses = await db.all(`
      SELECT 
        processStage,
        SUM(quantity) as totalQuantity,
        MAX(date) as lastUpdateDate,
        COUNT(*) as updateCount
      FROM daily_production_status 
      WHERE orderId = ? AND processStage IS NOT NULL
      GROUP BY processStage
      ORDER BY lastUpdateDate DESC
    `, params.orderId);
    
    // Get order details to know the total quantity
    const order = await db.get(`
      SELECT quantity FROM marketing_orders WHERE id = ?
    `, params.orderId);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Format the response
    const processSummary = processStatuses.map((status: any) => ({
      processStage: status.processStage,
      totalQuantity: status.totalQuantity,
      lastUpdateDate: status.lastUpdateDate,
      updateCount: status.updateCount,
      percentage: order.quantity > 0 ? Math.round((status.totalQuantity / order.quantity) * 100) : 0,
      status: status.totalQuantity >= order.quantity ? 'Completed' : status.totalQuantity > 0 ? 'Partial' : 'Pending'
    }));
    
    return NextResponse.json(processSummary);
  } catch (error: any) {
    console.error('Error fetching process status:', error);
    return NextResponse.json({ error: 'Failed to fetch process status', details: error.message }, { status: 500 });
  }
}