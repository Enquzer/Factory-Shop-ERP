import { NextResponse } from 'next/server';
import { createNotification, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notifications';
import { getDb } from '@/lib/db';

// POST /api/notifications - Create a new notification
export async function POST(request: Request) {
  try {
    const notificationData = await request.json();
    
    // Validate required fields
    if (!notificationData.userType || !notificationData.title || !notificationData.description || !notificationData.href) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const notificationId = await createNotification(notificationData);
    
    return NextResponse.json({ id: notificationId }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// GET /api/notifications - Get notifications for a user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') as 'factory' | 'shop' | null;
    const shopId = searchParams.get('shopId');
    
    console.log('GET request params:', { userType, shopId }); // Debug log
    
    if (!userType) {
      return NextResponse.json({ error: 'User type is required' }, { status: 400 });
    }
    
    const notifications = await getNotifications(userType, shopId);
    
    console.log('Returning notifications:', notifications); // Debug log
    
    const response = NextResponse.json(notifications);
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PUT /api/notifications - Mark notification(s) as read
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const markAll = searchParams.get('markAll') === 'true';
    const userType = searchParams.get('userType') as 'factory' | 'shop' | null;
    const shopId = searchParams.get('shopId');
    
    console.log('PUT request params:', { notificationId, markAll, userType, shopId });
    
    // If notificationId is provided, mark that specific notification as read
    if (notificationId) {
      console.log('Marking notification as read:', notificationId); // Debug log
      await markNotificationAsRead(notificationId);
      return NextResponse.json({ message: 'Notification marked as read' });
    }
    // If userType is provided, mark all notifications as read for that user
    else if (userType) {
      console.log('Marking all notifications as read for userType:', userType, 'shopId:', shopId); // Debug log
      await markAllNotificationsAsRead(userType, shopId);
      return NextResponse.json({ message: 'All notifications marked as read' });
    } 
    // If neither is provided, return an error
    else {
      return NextResponse.json({ error: 'Notification ID or user type is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}