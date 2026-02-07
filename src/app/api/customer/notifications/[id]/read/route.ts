import { NextRequest, NextResponse } from 'next/server';
import { markNotificationAsRead } from '@/lib/notifications-driver';
import { authenticateRequest } from '@/lib/auth-middleware';

// POST /api/customer/notifications/[id]/read - Mark notification as read
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const success = await markNotificationAsRead(id);
    
    if (success) {
      return NextResponse.json({ message: 'Notification marked as read' });
    } else {
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }
  } catch (error) {
    console.error('API Customer Notification Read POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}