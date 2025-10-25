import { NextResponse } from 'next/server';
import { updateDailyProductionStatus, getDailyProductionStatus } from '@/lib/marketing-orders';

// POST /api/marketing-orders/daily-status - Update daily production status
export async function POST(request: Request) {
  try {
    const statusData = await request.json();
    
    // Validate required fields
    if (!statusData.orderId || !statusData.date || !statusData.size || !statusData.color) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const success = await updateDailyProductionStatus(statusData);
    
    if (success) {
      return NextResponse.json({ message: 'Daily production status updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update daily production status' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error updating daily production status:', error);
    return NextResponse.json({ error: 'Failed to update daily production status', details: error.message }, { status: 500 });
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