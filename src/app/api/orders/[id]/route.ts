import { NextResponse, NextRequest } from 'next/server';
import { getOrderByIdFromDB } from '@/lib/orders';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/orders/[id] - Get a single order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    
    // Only factory, shop, finance, and store users can access orders
    if (!user || (user.role !== 'factory' && user.role !== 'shop' && user.role !== 'finance' && user.role !== 'store')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const order = await getOrderByIdFromDB(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Include authentication check for shop users - they can only see their own orders
    if (user.role === 'shop' && order.shopId !== user.id.toString()) {
       return NextResponse.json({ error: 'Unauthorized - You can only view your own orders' }, { status: 403 });
    }
    
    // Add cache control to prevent caching
    const response = NextResponse.json(order);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error(`Error fetching order ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}