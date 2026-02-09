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

    // Only proceed if order is in 'in_transit' status
    if (order.status !== 'in_transit') {
      return NextResponse.json({ 
        error: 'Order must be in transit status to mark as delivered' 
      }, { status: 400 });
    }

    // Update order status to delivered
    const success = await updateEcommerceOrder(orderId, { status: 'delivered' });
    
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
        'Order Delivered',
        `Your order #${orderId.split('-').pop()} has been successfully delivered!`,
        `/ecommerce/orders/${orderId}`,
        false
      ]);

      return NextResponse.json({ 
        success: true,
        message: 'Order status updated to delivered',
        previousStatus: 'in_transit',
        newStatus: 'delivered'
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to update order status' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Auto delivery update error:', error);
    return NextResponse.json({ 
      error: 'Failed to update order delivery status automatically' 
    }, { status: 500 });
  }
}