import { NextRequest, NextResponse } from 'next/server';
import { createEcommerceOrder, initializeCustomerTables } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    // Ensure tables exist
    await initializeCustomerTables();
    
    const authResult = await authenticateRequest(request);
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      customerName, 
      customerEmail, 
      customerPhone, 
      deliveryAddress, 
      city, 
      subCity,
      totalAmount, 
      transportationCost,
      latitude,
      longitude,
      deliveryDistance,
      deliveryType,
      items,
      paymentMethod
    } = body;
    
    // Validate required fields
    if (!customerName || !items || items.length === 0 || !totalAmount) {
      const missing = [];
      if (!customerName) missing.push('Customer Name');
      if (!items || items.length === 0) missing.push('Cart Items');
      if (!totalAmount) missing.push('Total Amount');
      return NextResponse.json({ 
        error: `Incomplete order data: Missing ${missing.join(', ')}`,
        details: { customerName, itemsCount: items?.length, totalAmount } 
      }, { status: 400 });
    }
    
    // Create the order
    const order = await createEcommerceOrder({
      customerId: authResult.username, 
      customerName,
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      deliveryAddress: `${deliveryAddress}${subCity ? ', ' + subCity : ''}`,
      city: city || 'Addis Ababa',
      shopId: 'CENTRAL-ONLINE', // This could be dynamic based on settings
      shopName: 'Central Online Store',
      totalAmount,
      transportationCost: transportationCost || 0,
      latitude: latitude || null,
      longitude: longitude || null,
      deliveryDistance: deliveryDistance || 0,
      deliveryType: deliveryType || 'standard',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: paymentMethod || 'telebirr',
    }, items);

    // Notify Ecommerce Manager
    await createNotification({
      userType: 'ecommerce',
      title: 'New Order Placed',
      description: `Order #${order.id.split('-').pop()} from ${customerName}. Amount: ${totalAmount} ETB`,
      href: `/ecommerce-manager/orders?highlight=${order.id}`
    });
    
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ 
      error: 'Failed to process order', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { getCustomerOrders } = await import('@/lib/customers-sqlite');
    const orders = await getCustomerOrders(authResult.username);
    
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
