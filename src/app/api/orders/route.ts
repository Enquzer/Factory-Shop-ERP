import { NextResponse } from 'next/server';
import { getOrdersFromDB, getOrdersForShop } from '@/lib/orders';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { authenticateRequest, isFactoryUser } from '@/lib/auth-middleware';
import { NextRequest } from 'next/server';

// GET /api/orders - Get all orders
export async function GET(request: NextRequest) {
  // Authenticate the request
  const user = await authenticateRequest(request);
  
  // If no user or not factory user, return unauthorized
  if (!user || !isFactoryUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
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
export async function POST(request: NextRequest) {
  // Authenticate the request
  const user = await authenticateRequest(request);
  
  // If no user or not factory user, return unauthorized
  if (!user || !isFactoryUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const orderData = await request.json();
    console.log('Received order data:', orderData);
    
    // Validate required fields
    if (!orderData.shopId || !orderData.shopName || !orderData.items || !Array.isArray(orderData.items)) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }
    
    // Check factory stock for each item before allowing the order
    const db = await getDb();
    for (const item of orderData.items) {
      const variant = await db.get(`
        SELECT stock FROM product_variants WHERE id = ?
      `, item.variant.id);
      
      if (!variant) {
        return NextResponse.json({ 
          error: `Product variant ${item.variant.id} not found in factory inventory` 
        }, { status: 400 });
      }
      
      if (variant.stock < item.quantity) {
        return NextResponse.json({ 
          error: `Insufficient factory stock for ${item.name}. Requested: ${item.quantity}, Available: ${variant.stock}` 
        }, { status: 400 });
      }
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
      items: orderData.items,
      // Initialize delivery performance tracking fields
      requestedDeliveryDate: orderData.requestedDeliveryDate || null,
      expectedReceiptDate: orderData.expectedReceiptDate || null,
      actualDispatchDate: null,
      confirmationDate: null
    };

    // Insert order into database
    await db.run(`
      INSERT INTO orders (id, shopId, shopName, date, status, amount, items, requestedDeliveryDate, expectedReceiptDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      orderId,
      newOrderData.shopId,
      newOrderData.shopName,
      newOrderData.date,
      newOrderData.status,
      newOrderData.amount,
      JSON.stringify(newOrderData.items),
      newOrderData.requestedDeliveryDate,
      newOrderData.expectedReceiptDate
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