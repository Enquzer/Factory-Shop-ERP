import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { withRoleAuth } from '@/lib/auth-middleware';

// POST /api/orders/[id]/request-payment - Finance requests payment from shop
export const POST = withRoleAuth(async (request: NextRequest, user: any) => {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.indexOf('orders') + 1];

    if (!id) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), { status: 400 });
    }

    const body = await request.json();
    const { message } = body;

    const db = await getDb();
    
    // Get the order to identify the shop
    const order = await db.get(`SELECT shopId, shopName FROM orders WHERE id = ?`, [id]);
    
    if (!order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    // Create notification for the shop
    await createNotification({
      userType: 'shop',
      shopId: order.shopId,
      title: `Payment Requested`,
      description: message || `Finance team has requested payment for Order #${id}. Please complete the payment process.`,
      href: `/shop/orders/${id}`,
    });
    
    // Update order to mark payment as requested
    await db.run('UPDATE orders SET paymentRequested = 1 WHERE id = ?', [id]);

    return new Response(JSON.stringify({ message: 'Payment request sent successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error requesting payment:', error);
    return new Response(JSON.stringify({ error: 'Failed to request payment' }), { status: 500 });
  }
}, 'finance');
