import { NextRequest } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/orders/[id]/release - Release order to store after payment verification
export const PUT = withRoleAuth(async (request: NextRequest, user: any) => {
  try {
    // Extract order ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const orderId = pathParts[pathParts.indexOf('orders') + 1];

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Connect to database
    const db = await getDb();

    // Get the current order
    const order = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, [orderId]);

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify that the status transition is valid
    if (order.status !== 'Paid') {
      return new Response(
        JSON.stringify({ error: `Order must be 'Paid' before it can be released to store. Current status: ${order.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the order status to 'Released'
    await db.run(`
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ['Released', orderId]);

    // Create notification for store user about released order
    await createNotification({
      userType: 'store',
      title: 'Order Released to Store',
      description: `Order #${orderId} has been released by finance and is ready for dispatch.`,
      href: `/store/orders/${orderId}`
    });

    // Create notification for factory user
    await createNotification({
      userType: 'factory',
      title: 'Order Released to Store',
      description: `Order #${orderId} was released to store by finance user ${user.username}.`,
      href: `/orders/${orderId}`
    });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order released to store successfully',
        orderId: orderId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error releasing order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}, 'finance');
