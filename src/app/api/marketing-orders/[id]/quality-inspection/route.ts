import { NextRequest } from 'next/server';
import { updateMarketingOrder, getMarketingOrderById } from '@/lib/marketing-orders';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'quality_inspection' && user.role !== 'factory')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderId = params.id;
    const { inspectionReport, okToPack, status } = await request.json();

    // Validate required fields
    if (okToPack === undefined || typeof okToPack !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Missing required field: okToPack (boolean) is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the current order to check its status and ensure it's ready for quality inspection
    const order = await getMarketingOrderById(orderId);
    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if order is in the correct status for quality inspection (should be Finishing or Quality Inspection)
    if (order.status !== 'Finishing' && order.status !== 'Quality Inspection') {
      return new Response(JSON.stringify({ error: 'Order is not ready for quality inspection. It must be in Finishing or Quality Inspection status.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare updates
    const updates: any = {
      qualityInspectionStatus: status || 'completed',
      qualityInspectionCompletionDate: new Date().toISOString(),
      packingStatus: okToPack ? 'Ready' : 'Hold'
    };

    // If OK to pack, move the order to Packing status
    if (okToPack) {
      updates.status = 'Packing';
    }

    // Update the order
    await updateMarketingOrder(orderId, updates);

    return new Response(JSON.stringify({ 
      message: okToPack ? 'Order approved for packing' : 'Quality inspection completed with hold status',
      orderId,
      okToPack,
      inspectionReport: inspectionReport || 'No report provided'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error processing quality inspection:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}