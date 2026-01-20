import { NextRequest } from 'next/server';
import { withAuth, withRoleAuth } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/orders/[id]/payment-verify - Verify payment for an order by finance user
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

    // Parse request body
    const { status, actionBy } = await request.json();

    if (!status) {
      return new Response(
        JSON.stringify({ error: 'Status is required' }),
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
    if (order.status !== 'Awaiting Payment' && order.status !== 'Pending') {
      return new Response(
        JSON.stringify({ error: `Order cannot be verified for payment at '${order.status}' stage` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the order status to 'Paid'
    await db.run(`
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ['Paid', orderId]);

    // Create notification for factory user about verified payment
    await createNotification({
      userType: 'factory',
      title: 'Payment Verified by Finance',
      description: `Order #${orderId} payment has been verified by finance user ${user.username}. Ready for dispatch.`,
      href: `/orders/${orderId}`
    });

    // Create notification for shop user about payment verification
    await createNotification({
      userType: 'shop',
      shopId: order.shopId,
      title: 'Payment Verified',
      description: `Your order #${orderId} payment has been verified by finance and is now ready for dispatch.`,
      href: `/shop/orders/${orderId}`
    });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified successfully',
        orderId: orderId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}, 'finance');