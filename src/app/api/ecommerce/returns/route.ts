import { NextRequest, NextResponse } from 'next/server';
import { createReturnRequest, getReturnRequestsByCustomer, getAllReturnRequests } from '@/lib/customers-sqlite';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, customerId, customerName, items, reason, explanation } = body;

    if (!orderId || !customerId || !customerName || !items || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const returnRequest = await createReturnRequest({
      orderId,
      customerId,
      customerName,
      items: typeof items === 'string' ? items : JSON.stringify(items),
      reason,
      explanation
    });

    // Notify Ecommerce Manager
    await createNotification({
      userType: 'ecommerce',
      title: 'New Return Request',
      description: `Return request for Order #${orderId.split('-').pop()}. Reason: ${reason}`,
      href: `/ecommerce-manager/returns?highlight=${returnRequest.id}`
    });

    return NextResponse.json(returnRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating return request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const all = searchParams.get('all') === 'true';

    if (all) {
      const requests = await getAllReturnRequests();
      return NextResponse.json(requests);
    }

    if (customerId) {
      const requests = await getReturnRequestsByCustomer(customerId);
      return NextResponse.json(requests);
    }

    return NextResponse.json(
      { error: 'Provide customerId or set all=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching return requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
