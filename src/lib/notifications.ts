import { getDb } from './db';

export type Notification = {
    id: string;
    userType: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'designer' | 'marketing' | 'ecommerce' | 'driver';
    shopId?: string; // only for shop users
    title: string;
    description: string;
    href: string;
    isRead: boolean;
    createdAt: Date;
}

// Create a notification
export const createNotification = async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    try {
        const db = await getDb();
        const notificationId = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        console.log('Creating notification:', { ...notification, id: notificationId });
        
        await db.run(`
          INSERT INTO notifications (id, userType, shopId, title, description, href, isRead, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            notificationId,
            notification.userType,
            notification.shopId || null,
            notification.title,
            notification.description,
            notification.href,
            0, // isRead = false
            new Date().toISOString()
        );
        
        console.log('Notification created successfully:', notificationId);
        return notificationId;
    } catch (error) {
        console.error("Error creating notification: ", error);
        throw error;
    }
};

// Get notifications for a user type (and optional shopId)
export const getNotifications = async (userType: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'designer' | 'marketing' | 'ecommerce' | 'driver', shopId: string | null): Promise<Notification[]> => {
    try {
        const db = await getDb();
        let notifications;
        if (userType === 'shop' && shopId) {
            console.log('Fetching shop notifications for shopId:', shopId); // Debug log
            // Modified query to ensure shop notifications are fetched correctly
            notifications = await db.all(`
              SELECT * FROM notifications 
              WHERE userType = ? AND (shopId = ? OR shopId IS NULL)
              ORDER BY created_at DESC
            `, userType, shopId);
            console.log('Found shop notifications:', notifications); // Debug log
        } else {
            // Fetching notifications
            notifications = await db.all(`
              SELECT * FROM notifications 
              WHERE userType = ?
              ORDER BY created_at DESC
            `, userType);
            // Found notifications
        }
        return notifications.map((notification: any) => ({
            ...notification,
            createdAt: new Date(notification.created_at)
        }));
    } catch (error) {
        console.error("Error getting notifications: ", error);
        return [];
    }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId: string) => {
    try {
        const db = await getDb();
        console.log('Marking notification as read:', notificationId); // Debug log
        await db.run(`
          UPDATE notifications 
          SET isRead = 1 
          WHERE id = ?
        `, notificationId);
        console.log('Notification marked as read successfully'); // Debug log
    } catch (error) {
        console.error("Error marking notification as read: ", error);
    }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userType: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'designer' | 'marketing' | 'ecommerce' | 'driver', shopId: string | null) => {
    try {
        const db = await getDb();
        // Marking notifications as read
        if (userType === 'shop' && shopId) {
            await db.run(`
              UPDATE notifications 
              SET isRead = 1 
              WHERE userType = ? AND (shopId = ? OR shopId IS NULL)
            `, userType, shopId);
        } else {
            await db.run(`
              UPDATE notifications 
              SET isRead = 1 
              WHERE userType = ?
            `, userType);
        }
        console.log('All notifications marked as read successfully'); // Debug log
    } catch (error) {
        console.error("Error marking all notifications as read: ", error);
    }
};