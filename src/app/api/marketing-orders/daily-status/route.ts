import { NextResponse } from 'next/server';
import { updateDailyProductionStatus, getDailyProductionStatus } from '@/lib/marketing-orders';

// POST /api/marketing-orders/daily-status - Update daily production status
export async function POST(request: Request) {
  try {
    const statusData = await request.json();
    
    // Validate required fields
    if (!statusData.orderId || !statusData.date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // If this is a total update, we require a process stage
    if (statusData.isTotalUpdate && !statusData.processStage) {
      return NextResponse.json({ error: 'Missing process stage for total update' }, { status: 400 });
    }
    
    // If this is not a total update, we also require a process stage
    if (!statusData.isTotalUpdate && !statusData.processStage) {
      return NextResponse.json({ error: 'Missing process stage for breakdown update' }, { status: 400 });
    }
    
    // If this is not a total update, we require size/color
    if (!statusData.isTotalUpdate && (!statusData.size || !statusData.color)) {
      return NextResponse.json({ error: 'Missing size or color for non-total update' }, { status: 400 });
    }
    
    const success = await updateDailyProductionStatus(statusData);
    
    if (success) {
      // Log to Production Ledger (Module C requirement)
      try {
          console.log('Logging production activity for stage:', statusData.processStage);
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { logProductionActivity } = require('@/lib/production-ledger');
          await logProductionActivity({
              orderId: statusData.orderId,
              processType: statusData.processStage,
              quantity: statusData.quantity,
              componentName: statusData.componentName || 'General',
              size: statusData.isTotalUpdate ? undefined : statusData.size,
              color: statusData.isTotalUpdate ? undefined : statusData.color,
              userId: null,
              notes: statusData.isTotalUpdate ? 'Total Update' : `${statusData.size}-${statusData.color} - ${statusData.status}`
          });
      } catch (e) {
          console.error("Failed to log production ledger (non-fatal):", e);
      }

      return NextResponse.json({ message: 'Daily production status updated successfully' });
    } else {
      console.error('updateDailyProductionStatus returned false for:', statusData);
      return NextResponse.json({ error: 'Failed to update daily production status in DB' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in daily-status POST API:', error);
    return NextResponse.json({ 
      error: 'Failed to update daily production status', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

// GET /api/marketing-orders/daily-status/:orderId - Get daily production status for an order
export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }
    
    const statuses = await getDailyProductionStatus(orderId);
    
    return NextResponse.json(statuses);
  } catch (error: any) {
    console.error('Error fetching daily production status:', error);
    return NextResponse.json({ error: 'Failed to fetch daily production status', details: error.message }, { status: 500 });
  }
}