import { NextRequest, NextResponse } from 'next/server';
import { createSupportTicket, getSupportTicketsByOrder, getCustomerByUsername } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { orderId, subject, message } = body;
    
    if (!orderId || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const customer = await getCustomerByUsername(authResult.username);
    if (!customer) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const ticket = await createSupportTicket({
      orderId,
      customerId: customer.id,
      subject,
      message
    });
    
    // Notify Ecommerce Manager about new support ticket
    await createNotification({
      userType: 'ecommerce',
      title: 'New Support Ticket',
      description: `${subject} - Order #${orderId.split('-').pop()}`,
      href: `/ecommerce-manager/support`
    });
    
    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('Support API error:', error);
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
    }
    
    // Fetch tickets
    const tickets = await getSupportTicketsByOrder(orderId);
    
    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error('Support API error:', error);
    return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 });
  }
}
