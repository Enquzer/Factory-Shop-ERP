import { NextRequest, NextResponse } from 'next/server';
import { getOrdersFromDB, getOrdersForShop } from '@/lib/orders';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { authenticateRequest, isFactoryUser } from '@/lib/auth-middleware';
import { sendShopOrderNotification } from '@/lib/telegram-shop-notifications';
import { generateOrderPlacementPDF } from '@/lib/shop-order-telegram-pdf';

// GET /api/orders - Get all orders
export async function GET(request: NextRequest) {
  // Authenticate the request
  const user = await authenticateRequest(request);

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');

  // If shopId is provided, check if user is authorized to access that shop's orders
  if (shopId) {
    // Check if the user is authorized to access this shop's orders
    if (user?.role === 'shop') {
      // Shop user - need to verify this shopId belongs to their account
      // Get the shop by ID to check the username
      const db = await getDb();
      const shop = await db.get(`SELECT username FROM shops WHERE id = ?`, shopId);
      
      if (!shop || user.username !== shop.username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (user?.role !== 'factory' && user?.role !== 'finance' && user?.role !== 'store') {
      // Only factory, finance, store and shop users can access orders
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // Only factory, finance, and store users can access all orders
    if (!user || (user.role !== 'factory' && user.role !== 'finance' && user.role !== 'store')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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

  // If no user, return unauthorized
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only shop users can place orders - factories cannot place orders
  if (user.role !== 'shop') {
    return NextResponse.json({ error: 'Only registered shops can place orders' }, { status: 403 });
  }

  try {
    const orderData = await request.json();
    console.log('Received order data:', orderData);

    // Validate required fields
    if (!orderData.shopId || !orderData.shopName || !orderData.items || !Array.isArray(orderData.items)) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    // Shop users can only place orders for their own shop
    // Get the shop by ID to check the username
    const db = await getDb();
    const shop = await db.get(`SELECT username FROM shops WHERE id = ?`, orderData.shopId);
    
    if (!shop || user.username !== shop.username) {
      return NextResponse.json({ error: 'Unauthorized to place order for this shop' }, { status: 401 });
    }

    // Check factory stock for each item before allowing the order
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

    // Generate descriptive order ID
    // Format: ShopName_MonthDate_OrderSeq#
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthDate = `${monthNames[now.getMonth()]}${now.getDate()}`;
    const shopNameClean = orderData.shopName.replace(/[^a-zA-Z0-9]/g, '');
    
    // Get sequence number for this shop
    const sequenceResult = await db.get('SELECT COUNT(*) as count FROM orders WHERE shopId = ?', [orderData.shopId]);
    const nextSequence = (sequenceResult?.count || 0) + 1;
    
    const orderId = `${shopNameClean}_${monthDate}_Order${nextSequence}`;

    // Prepare order data
    const newOrderData = {
      ...orderData,
      id: orderId,
      status: 'Pending',
      date: now.toISOString().split('T')[0],
      createdAt: now,
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

    // Insert order items into the specialized order_items table for better reporting
    for (const item of newOrderData.items) {
      await db.run(`
        INSERT INTO order_items (orderId, productId, variantId, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `,
        orderId,
        item.productId,
        item.variant.id,
        item.quantity,
        item.price
      );
    }

    console.log('Order and items inserted into database:', orderId);

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
    
    // Create notification for finance
    try {
      await createNotification({
        userType: 'finance',
        title: `New Order: ${orderId}`,
        description: `New order from ${newOrderData.shopName} needs payment verification`,
        href: `/finance/orders`
      });
      console.log('Finance notification created for order:', orderId);
    } catch (notificationError) {
      console.error('Failed to create finance notification:', notificationError);
    }

    // NEW: Telegram Notification for Shop Channel
    try {
      // Generate Order Placement PDF
      const { pdfPath, summary } = await generateOrderPlacementPDF(orderId);
      
      // Send to Shop's dedicated Telegram Channel
      await sendShopOrderNotification(
        orderId,
        newOrderData.shopId,
        'order_placed',
        {
          pdfPath,
          caption: `📊 *Order Summary:*\n• Total Unique Styles: ${summary.uniqueStyles}\n• Total Quantity: ${summary.totalQuantity} pieces\n• Total Value: ${summary.totalValue.toLocaleString()} Birr`
        }
      );
      console.log('Shop Telegram notification sent for order:', orderId);
    } catch (telegramError) {
      console.error('Failed to send Shop Telegram notification:', telegramError);
    }

    return NextResponse.json(newOrderData);

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}