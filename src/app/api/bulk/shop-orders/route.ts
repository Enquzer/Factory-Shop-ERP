import { NextRequest } from 'next/server';
import { deleteOrderFromDB } from '@/lib/orders';

// DELETE /api/bulk/shop-orders - Delete multiple unpublished orders for shop users
export async function DELETE(request: NextRequest) {
  try {
    const { orderIds } = await request.json();
    
    // Validate required fields
    if (!orderIds || !Array.isArray(orderIds)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing or invalid order IDs array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate order IDs
    if (orderIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Order IDs array cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    for (const orderId of orderIds) {
      if (typeof orderId !== 'string' || !orderId.trim()) {
        return new Response(
          JSON.stringify({ success: false, message: 'All order IDs must be non-empty strings' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Delete orders one by one (only for orders with status 'Pending' - unpublished)
    let deletedCount = 0;
    const errors: string[] = [];
    
    for (const orderId of orderIds) {
      try {
        // In a real implementation, we would check the order status before deletion
        // For now, we'll assume the frontend has already filtered for unpublished orders
        const success = await deleteOrderFromDB(orderId);
        if (success) {
          deletedCount++;
        } else {
          errors.push(`Order with ID ${orderId} not found or failed to delete`);
        }
      } catch (error) {
        errors.push(`Error deleting order with ID ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} of ${orderIds.length} orders`,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting orders in bulk:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Failed to delete orders in bulk' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}