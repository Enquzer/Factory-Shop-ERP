import { NextResponse } from 'next/server';
import { getOrdersFromDB, getOrdersForShop } from '@/lib/orders';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// GET /api/orders - Get all orders
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');
  
  // If shopId is provided, get orders for that specific shop
  if (shopId) {
    try {
      const orders = await getOrdersForShop(shopId);
      const response = NextResponse.json(orders);
      
      // Add cache control headers to prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    } catch (error) {
      console.error('Error fetching orders for shop:', error);
      return NextResponse.json({ error: 'Failed to fetch orders for shop' }, { status: 500 });
    }
  }
  
  // Otherwise, get all orders
  try {
    const orders = await getOrdersFromDB();
    const response = NextResponse.json(orders);
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(request: Request) {
  try {
    const orderData = await request.json();
    console.log('Received order data:', orderData);
    
    // Validate required fields
    if (!orderData.shopId || !orderData.shopName || !orderData.items || !Array.isArray(orderData.items)) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }
    
    // Generate order ID
    const orderId = `ORD-${Date.now()}`;
    
    // Prepare order data
    const newOrderData = {
      ...orderData,
      id: orderId,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      items: orderData.items
    };

    // Insert order into database
    const db = await getDb();
    await db.run(`
      INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      orderId,
      newOrderData.shopId,
      newOrderData.shopName,
      newOrderData.date,
      newOrderData.status,
      newOrderData.amount,
      JSON.stringify(newOrderData.items)
    );

    console.log('Order inserted into database:', orderId);
    
    // Create notification for factory
    try {
      await createNotification({
        userType: 'factory',
        title: `New Order: ${orderId}`,
        description: `From ${newOrderData.shopName} for ETB ${newOrderData.amount.toFixed(2)}`,
        href: `/orders`
      });
      console.log('Factory notification created for order:', orderId);
    } catch (notificationError) {
      console.error('Failed to create factory notification:', notificationError);
    }

    return NextResponse.json(newOrderData);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}