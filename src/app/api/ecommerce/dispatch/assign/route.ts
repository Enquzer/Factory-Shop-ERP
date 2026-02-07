import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ecommerce and admin can assign drivers
    if (authResult.role !== 'ecommerce' && authResult.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { getDB } = await import('@/lib/db');
    const db = await getDB();

    const body = await request.json();
    console.log('[DISPATCH API] Received body:', JSON.stringify(body, null, 2));
    
    const { orderId, driverId, shopId, trackingNumber, estimatedDeliveryTime, transportCost, notes } = body;
    
    console.log('[DISPATCH API] Validation check:');
    console.log('  orderId:', orderId, '(exists:', !!orderId, ')');
    console.log('  driverId:', driverId, '(exists:', !!driverId, ')');
    console.log('  shopId:', shopId, '(exists:', !!shopId, ')');
    console.log('  trackingNumber:', trackingNumber, '(exists:', !!trackingNumber, ')');

    if (!orderId || !driverId || !trackingNumber || !shopId) {
      console.error('[DISPATCH API] Validation failed! Missing required fields.');
      return NextResponse.json({ error: 'Order ID, Driver ID, Shop ID, and Tracking Number are required' }, { status: 400 });
    }

    // Check if order exists and is ready for dispatch
    const existingOrder = await db.get('SELECT * FROM ecommerce_orders WHERE id = ?', [orderId]);
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { getDriverById, updateDriver, assignOrderToDriver } = await import('@/lib/drivers-sqlite');
    
    // Ensure driver record exists in the drivers table (auto-create if needed)
    // and set status to busy
    await updateDriver(driverId, { status: 'busy' });
    
    // Use the library function to handle fallback logic for department drivers
    const driver = await getDriverById(driverId);
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Since order_dispatches.driver_id references drivers.id (integer), 
    // we need to get the primary key from the drivers table.
    const driverRow = await db.get('SELECT id FROM drivers WHERE employeeId = ? OR id = ?', [driverId, driverId]);
    if (!driverRow) {
      return NextResponse.json({ error: 'Failed to find driver after update' }, { status: 500 });
    }
    const numericDriverId = driverRow.id;

    // Check if shop exists and get its location
    const shop = await db.get('SELECT * FROM shops WHERE id = ?', [shopId]);
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Create dispatch record
    const dispatchResult = await db.run(`
      INSERT INTO order_dispatches (
        order_id, driver_id, shop_id, tracking_number, estimated_delivery_time, 
        transport_cost, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned', ?)
    `, [orderId, numericDriverId, shopId, trackingNumber, estimatedDeliveryTime, transportCost, notes, authResult.username]);

    const dispatchId = dispatchResult.lastID;

    // Update order status and tracking number
    await db.run('UPDATE ecommerce_orders SET status = ?, trackingNumber = ?, shopId = ?, dispatchDate = CURRENT_TIMESTAMP WHERE id = ?',
      ['in_transit', trackingNumber, shopId, orderId]);

    // Reduce inventory from the selected shop
    const { reduceShopInventoryStock } = await import('@/lib/shop-inventory-sqlite');
    const orderItems = await db.all('SELECT productVariantId, quantity FROM ecommerce_order_items WHERE orderId = ?', [orderId]);
    
    for (const item of orderItems) {
      await reduceShopInventoryStock(shopId, item.productVariantId, item.quantity);
    }

    // Create driver assignment using our unified lib
    await assignOrderToDriver(
      driverId,
      orderId,
      authResult.username,
      { 
        lat: shop.latitude || 9.03, 
        lng: shop.longitude || 38.74, 
        name: shop.name || 'Shop Location' 
      },
      { 
        lat: existingOrder.latitude || 0, 
        lng: existingOrder.longitude || 0, 
        name: existingOrder.deliveryAddress || 'Customer Address' 
      }
    );

    // Send notification to the driver
    if (driver.userId) {
      const notificationId = `NOTIF-DRV-${Date.now()}`;
      await db.run(`
        INSERT INTO notifications (
          id, userId, type, title, message, orderId, isRead, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        notificationId,
        driver.userId,
        'new_delivery',
        'New Delivery Assigned',
        `You have a new delivery request for order #${orderId} from ${shop.name} to ${existingOrder.customerName}.`,
        orderId,
        false
      ]);
    }

    // Get the complete dispatch record
    const newDispatch = await db.get(`
      SELECT od.*, d.userId, d.vehicleType,
             e.name as employee_name, e.phone as driver_phone, e.profilePicture
      FROM order_dispatches od
      JOIN drivers d ON (od.driver_id = CAST(d.id AS TEXT) OR od.driver_id = d.employeeId)
      LEFT JOIN employees e ON d.employeeId = e.employeeId
      WHERE od.id = ?
    `, [dispatchId]);

    return NextResponse.json({ 
      success: true, 
      dispatch: newDispatch,
      message: 'Driver assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning driver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ecommerce and admin can view dispatches
    if (authResult.role !== 'ecommerce' && authResult.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { getDB } = await import('@/lib/db');
    const db = await getDB();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    let query = `
      SELECT od.*, d.userId, d.vehicleType,
             e.name as employee_name, e.phone as driver_phone,
             o.order_id as order_number, o.customer_name, o.total_amount
      FROM order_dispatches od
      JOIN drivers d ON (od.driver_id = CAST(d.id AS TEXT) OR od.driver_id = d.employeeId)
      LEFT JOIN employees e ON d.employeeId = e.employeeId
      JOIN ecommerce_orders o ON od.order_id = o.id
    `;
    
    const params: any[] = [];
    
    if (orderId) {
      query += ' WHERE od.order_id = ?';
      params.push(orderId);
    }
    
    query += ' ORDER BY od.created_at DESC';

    const dispatches = await db.all(query, params);

    return NextResponse.json({ dispatches });

  } catch (error) {
    console.error('Error fetching dispatches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}