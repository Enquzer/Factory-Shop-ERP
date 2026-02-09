import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { orderId, type, message } = await request.json();
    
    if (!orderId || !type || !message) {
      return NextResponse.json({ 
        error: 'Order ID, type, and message are required' 
      }, { status: 400 });
    }

    const db = await getDB();
    
    // Get customer information for the order
    const order = await db.get(`
      SELECT customerId, customerName, customerEmail, customerPhone
      FROM ecommerce_orders 
      WHERE id = ?
    `, [orderId]);

    if (!order) {
      return NextResponse.json({ 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Create notification in the notifications table
    const notificationId = `NOTIF-${Date.now()}`;
    
    await db.run(`
      INSERT INTO notifications (
        id, userId, userType, title, description, href, isRead, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      notificationId,
      order.customerId,
      'customer',
      type === 'order_cancelled' ? 'Order Cancelled' : 'Order Update',
      message,
      `/ecommerce/orders/${orderId}`,
      false
    ]);

    // Also send email/SMS notification (simplified)
    console.log(`Notification sent to customer ${order.customerName}: ${message}`);

    return NextResponse.json({ 
      success: true,
      notificationId,
      message: 'Customer notified successfully'
    });

  } catch (error) {
    console.error('Notification sending error:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification' 
    }, { status: 500 });
  }
}