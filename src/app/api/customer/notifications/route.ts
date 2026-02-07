import { NextRequest, NextResponse } from 'next/server';
import { getUserNotifications, markNotificationAsRead } from '@/lib/notifications-driver';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/customer/notifications - Get customer notifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const notifications = await getUserNotifications(authResult.id.toString());
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('API Customer Notifications GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}