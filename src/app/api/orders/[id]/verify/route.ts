import { NextRequest } from 'next/server';
import { withAuth, withRoleAuth } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/orders/[id]/verify - Verify an order by store user
export const PUT = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const orderId = params.id;

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
    if (order.status !== 'Pending') {
      return new Response(
        JSON.stringify({ error: 'Order cannot be verified at this stage' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the order status to 'Awaiting Payment'
    await db.run(`
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ['Awaiting Payment', orderId]);

    // Create notification for factory user about verified order
    await createNotification({
      userType: 'factory',
      title: 'Order Verified by Store',
      description: `Order #${orderId} has been verified by store user ${user.username}. Ready for payment processing.`,
      href: `/orders/${orderId}`
    });

    // Create notification for shop user about order verification
    await createNotification({
      userType: 'shop',
      shopId: order.shopId,
      title: 'Order Verified',
      description: `Your order #${orderId} has been verified by the store and is now awaiting payment.`,
      href: `/shop/orders/${orderId}`
    });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order verified successfully',
        orderId: orderId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}, 'store');