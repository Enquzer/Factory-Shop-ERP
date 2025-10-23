import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/orders/[id]/status - Update order status
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { status } = await request.json();

    // Get the current order before updating
    const db = await getDb();
    const currentOrder = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, id);

    // Update order status in database
    await db.run(`
      UPDATE orders 
      SET status = ? 
      WHERE id = ?
    `, status, id);

    // Get the updated order
    const order = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, id);

    if (order) {
      if (status === 'Awaiting Payment') {
        // Create notification for the factory
        await createNotification({
          userType: 'factory',
          title: `Order Confirmed`,
          description: `Order #${id} for ${order.shopName} has been confirmed.`,
          href: '/orders',
        });
        
        // Create notification for the specific shop that placed the order
        await createNotification({
          userType: 'shop',
          shopId: order.shopId,
          title: `Order Confirmed`,
          description: `Your order #${id} has been confirmed by the factory.`,
          href: '/shop/orders',
        });
      } else if (status === 'Paid') {
        // Create notification for the factory
        await createNotification({
          userType: 'factory',
          title: `Order Payment Confirmed`,
          description: `Order #${id} from ${order.shopName} payment has been confirmed.`,
          href: '/orders',
        });
        
        // Create notification for the shop
        await createNotification({
          userType: 'shop',
          shopId: order.shopId,
          title: `Order Payment Confirmed`,
          description: `Your order #${id} payment has been confirmed.`,
          href: '/shop/orders',
        });
      } else if (status === 'Delivered') {
        // Create notification for the factory
        await createNotification({
          userType: 'factory',
          title: `Order Status Updated`,
          description: `Order #${id} from ${order.shopName} is now '${status}'`,
          href: '/orders',
        });
      }
    }

    return NextResponse.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}