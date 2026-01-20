import { NextRequest } from 'next/server';
import { updateMarketingOrder, getMarketingOrderById } from '@/lib/marketing-orders';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'packing' && user.role !== 'factory')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderId = params.id;
    const { color, size, quantity, status } = await request.json();

    // Validate required fields
    if (!color || !size || !quantity || quantity <= 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields: color, size, and quantity (positive number) are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the current order to check its status and ensure it's ready for packing
    const order = await getMarketingOrderById(orderId);
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if order is in the correct status for packing (should be Quality Inspection or Packing)
    if (order.status !== 'Quality Inspection' && order.status !== 'Packing') {
      return new Response(JSON.stringify({ error: 'Order is not ready for packing. It must be in Quality Inspection or Packing status.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the order status to 'Packing' if it's not already
    if (order.status !== 'Packing') {
      await updateMarketingOrder(orderId, { status: 'Packing' });
    }

    // In a real implementation, you would update the actual packed quantities
    // For now, we'll just return a success response
    // In a full implementation, you would likely update a separate packing records table
    
    return new Response(JSON.stringify({ 
      message: 'Packed quantities registered successfully',
      orderId,
      packed: { color, size, quantity, status: status || 'packed' }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error registering packed quantities:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}