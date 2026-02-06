import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';
import { createRareProductRequest, initializeCustomerTables } from '@/lib/customers-sqlite';
import { getCustomerByUsername } from '@/lib/customers-sqlite';

export async function POST(request: NextRequest) {
  try {
    // Ensure tables exist
    await initializeCustomerTables();
    
    const authResult = await authenticateRequest(request);
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productName, description, budget, urgency } = body;

    if (!productName || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get customer details
    const customer = await getCustomerByUsername(authResult.username);
    
    // Create the rare product request record
    const requestRecord = await createRareProductRequest({
      customerId: customer?.id || authResult.username,
      customerName: customer?.firstName ? `${customer.firstName} ${customer.lastName}` : (authResult.username),
      productName,
      description,
      budget: budget || null,
      urgency: urgency || 'normal',
      imageUrl: body.imageUrl || null
    });

    await createNotification({
      userType: 'ecommerce',
      title: 'Rare Product Request',
      description: `Item: ${productName}. Cust: ${authResult.username}. ${description}. Budget: ${budget || 'N/A'}`,
      href: `/ecommerce-manager/requests`
    });

    return NextResponse.json({ success: true, message: 'Request submitted successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error submitting rare request:', error);
    return NextResponse.json({ 
      error: 'Failed to submit request', 
      details: error.message 
    }, { status: 500 });
  }
}
