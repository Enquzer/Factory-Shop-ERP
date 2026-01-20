import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getOrderByIdFromDB } from '@/lib/orders';
import { createNotification } from '@/lib/notifications';

export const PUT = withRoleAuth(async (request: NextRequest, user: any) => {
  const params = request.nextUrl.pathname.split('/');
  // URL structure: /api/orders/[id]/dispatch
  // We need to extract the ID correctly. 
  // Next.js Route Handlers receive params as the second argument, but withRoleAuth might interfere if not handled carefully.
  // Actually, withRoleAuth wraps the handler. The handler signature is (req, user).
  // params should be extracted from context if passed, but withRoleAuth wrapper might drop it if not defined.
  // However, I can parse it from URL or modify withRoleAuth...
  // Let's assume I can parse it from pathname or just pass it through if withRoleAuth allowed it.
  
  // Actually, let's extract orderId from the URL since we can't easily rely on params via the HOC signature without changing it.
  const orderIdStartIndex = request.nextUrl.pathname.indexOf('/orders/') + 8;
  const orderIdEndIndex = request.nextUrl.pathname.indexOf('/dispatch');
  const orderId = request.nextUrl.pathname.substring(orderIdStartIndex, orderIdEndIndex);

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  const { status } = await request.json();

  if (status !== 'Dispatched') {
    return NextResponse.json({ error: 'Invalid status for dispatch' }, { status: 400 });
  }

  // Get the order to verify current status and get details for notification
  const order = await getOrderByIdFromDB(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'Paid' && order.status !== 'Released') {
    return NextResponse.json({ error: 'Order must be Paid or Released before dispatching' }, { status: 400 });
  }

  const db = await getDb();
  
  // Update the order status to 'Dispatched'
  await db.run(`
    UPDATE orders 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, ['Dispatched', orderId]);

  // Update actualDispatchDate
  const dispatchDate = new Date().toISOString();
  await db.run(`
     UPDATE orders
     SET actualDispatchDate = ?
     WHERE id = ?
  `, [dispatchDate, orderId]);

  // Create notification for the shop user about dispatch
  try {
    if (order.shopId) {
        await createNotification({
            userType: 'shop',
            shopId: order.shopId,
            title: 'Order Dispatched',
            description: `Your order #${orderId} has been dispatched and is on its way.`,
            href: `/shop/orders/${orderId}`
        });
    }
  } catch (err) {
      console.error('Failed to notify shop:', err);
  }

  // Create notification for factory
  try {
    await createNotification({
        userType: 'factory',
        title: 'Order Dispatched',
        description: `Order #${orderId} has been dispatched by store user ${user.username}.`,
        href: `/orders/${orderId}` // Or orders list
    });
  } catch (err) {
      console.error('Failed to notify factory:', err);
  }

  return NextResponse.json({ message: 'Order dispatched successfully', order: { ...order, status: 'Dispatched' } });

}, 'store'); // Only store users can access this route