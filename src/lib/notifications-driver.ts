import { getDB } from './db';

// Send notification to customer when driver is assigned
export async function sendDriverAssignedNotification(orderId: string, driverName: string, driverPhone: string): Promise<boolean> {
  try {
    const db = await getDB();
    
    // Get order details to find customer
    const order = await db.get(`
      SELECT customerId, customerName, customerEmail, customerPhone 
      FROM ecommerce_orders 
      WHERE id = ?
    `, [orderId]);
    
    if (!order) {
      console.error('Order not found for notification');
      return false;
    }
    
    // Create notification record
    const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await db.run(`
      INSERT INTO notifications (
        id, userId, type, title, message, orderId, isRead, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      notificationId,
      order.customerId,
      'driver_assigned',
      'Driver Assigned to Your Order',
      `Good news! Driver ${driverName} has been assigned to deliver your order #${orderId}. You can now track your order in real-time. Driver contact: ${driverPhone}`,
      orderId,
      false
    ]);
    
    // Mark notification as sent in driver assignment
    await db.run(`
      UPDATE driver_assignments 
      SET notificationSent = TRUE 
      WHERE orderId = ?
    `, [orderId]);
    
    console.log(`Notification sent to customer ${order.customerName} for order ${orderId}`);
    return true;
  } catch (error) {
    console.error('Error sending driver assigned notification:', error);
    return false;
  }
}

// Send status update notification to customer
export async function sendOrderStatusUpdateNotification(orderId: string, status: string, driverName?: string): Promise<boolean> {
  try {
    const db = await getDB();
    
    // Get order details
    const order = await db.get(`
      SELECT customerId, customerName 
      FROM ecommerce_orders 
      WHERE id = ?
    `, [orderId]);
    
    if (!order) {
      return false;
    }
    
    let title = '';
    let message = '';
    
    switch (status) {
      case 'accepted':
        title = 'Order Accepted';
        message = `Your order #${orderId} has been accepted by driver ${driverName || 'your assigned driver'} and is being prepared for pickup.`;
        break;
      case 'picked_up':
        title = 'Order Picked Up';
        message = `Your order #${orderId} has been picked up by driver ${driverName || 'your assigned driver'} and is on the way!`;
        break;
      case 'in_transit':
        title = 'Order In Transit';
        message = `Your order #${orderId} is now in transit and heading to your location.`;
        break;
      case 'delivered':
        title = 'Order Delivered!';
        message = `Great news! Your order #${orderId} has been successfully delivered. Thank you for choosing us!`;
        break;
      default:
        return false;
    }
    
    const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await db.run(`
      INSERT INTO notifications (
        id, userId, type, title, message, orderId, isRead, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      notificationId,
      order.customerId,
      'order_status',
      title,
      message,
      orderId,
      false
    ]);
    
    console.log(`Status update notification sent for order ${orderId}: ${status}`);
    return true;
  } catch (error) {
    console.error('Error sending status update notification:', error);
    return false;
  }
}

// Get unread notifications for user
export async function getUserNotifications(userId: string): Promise<any[]> {
  try {
    const db = await getDB();
    
    const notifications = await db.all(`
      SELECT * FROM notifications 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT 50
    `, [userId]);
    
    return notifications.map((notif: any) => ({
      ...notif,
      createdAt: new Date(notif.createdAt),
      isRead: Boolean(notif.isRead)
    }));
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const db = await getDB();
    
    await db.run(`
      UPDATE notifications 
      SET isRead = TRUE, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [notificationId]);
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// Initialize notifications table
export async function initializeNotificationsTable() {
  try {
    const db = await getDB();
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL, -- 'driver_assigned', 'order_status', 'general'
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        orderId TEXT,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (orderId) REFERENCES ecommerce_orders(id) ON DELETE SET NULL
      )
    `);
    
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_order ON notifications(orderId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(userId, isRead) WHERE isRead = FALSE`);
    
    console.log('Notifications table initialized successfully');
  } catch (error) {
    console.error('Error initializing notifications table:', error);
    throw error;
  }
}