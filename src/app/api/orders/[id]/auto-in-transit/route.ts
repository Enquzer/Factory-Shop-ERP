import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { updateEcommerceOrder } from '@/lib/ecommerce-manager';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const db = await getDB();
    
    // Get current order status
    const order = await db.get(`
      SELECT id, status, customerId, customerName
      FROM ecommerce_orders 
      WHERE id = ?
    `, [orderId]);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only proceed if order is in 'shipped' status
    if (order.status !== 'shipped') {
      return NextResponse.json({ 
        error: 'Order must be in shipped status to update to in_transit' 
      }, { status: 400 });
    }

    // Update order status to in_transit
    const success = await updateEcommerceOrder(orderId, { status: 'in_transit' });
    
    if (success) {
      // Create notification for customer
      await db.run(`
        INSERT INTO notifications (
          id, userId, userType, title, description, href, isRead, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        `NOTIF-${Date.now()}`,
        order.customerId,
        'customer',
        'Order In Transit',
        `Your order #${orderId.split('-').pop()} is now on its way to you!`,
        `/ecommerce/orders/${orderId}`,
        false
      ]);

      return NextResponse.json({ 
        success: true,
        message: 'Order status updated to in_transit',
        previousStatus: 'shipped',
        newStatus: 'in_transit'
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update order status' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Auto status update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update order status automatically' 
    }, { status: 500 });
  }
}