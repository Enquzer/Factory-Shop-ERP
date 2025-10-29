import { NextResponse } from 'next/server';
import { getTotalProducedQuantity } from '@/lib/marketing-orders';

// GET /api/marketing-orders/total-produced?orderId=... - Get total produced quantity for an order
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }
    
    const totalProduced = await getTotalProducedQuantity(orderId);
    
    return NextResponse.json({ totalProduced });
  } catch (error: any) {
    console.error('Error fetching total produced quantity:', error);
    return NextResponse.json({ error: 'Failed to fetch total produced quantity', details: error.message }, { status: 500 });
  }
}