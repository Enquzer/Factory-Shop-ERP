import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { getDriverById, updateDriver, assignOrderToDriver } from '@/lib/drivers-sqlite';
import { reduceShopInventoryStock } from '@/lib/shop-inventory-sqlite';

export async function POST(request: NextRequest) {
  try {
    console.log('[DISPATCH API] Starting dispatch assignment process...');
    
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      console.error('[DISPATCH API] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ecommerce and admin can assign drivers
    if (authResult.role !== 'ecommerce' && authResult.role !== 'admin') {
      console.error('[DISPATCH API] Forbidden access for role:', authResult.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[DISPATCH API] Authenticated user:', authResult.username, 'with role:', authResult.role);

    const db = await getDb();
    console.log('[DISPATCH API] Database connection established');

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
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['orderId', 'driverId', 'shopId', 'trackingNumber'],
        received: { orderId: !!orderId, driverId: !!driverId, shopId: !!shopId, trackingNumber: !!trackingNumber }
      }, { status: 400 });
    }

    console.log('[DISPATCH API] Checking if order exists:', orderId);
    // Check if order exists and is ready for dispatch
    const existingOrder = await db.get('SELECT * FROM ecommerce_orders WHERE id = ?', [orderId]);
    if (!existingOrder) {
      console.error('[DISPATCH API] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    console.log('[DISPATCH API] Order found:', existingOrder.id, 'with status:', existingOrder.status);

    console.log('[DISPATCH API] Getting driver info:', driverId);
    // Use the library function to handle fallback logic for department drivers
    let driver;
    try {
      driver = await getDriverById(driverId);
      console.log('[DISPATCH API] Driver found:', driver.id, driver.name);
    } catch (driverError: any) {
      console.error('[DISPATCH API] Failed to get driver:', driverError);
      return NextResponse.json({ error: 'Driver not found or invalid', details: driverError.message }, { status: 404 });
    }
    
    if (!driver) {
      console.error('[DISPATCH API] Driver object is null');
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Use the consistent driver ID format for both tables
    const consistentDriverId = driver.id; // Use the ID from the getDriverById result
    const numericDriverId = driver.id; // Use the same ID for the dispatch table
    
    // We'll update the driver status later in the process

    console.log('[DISPATCH API] Checking shop:', shopId);
    // Check if shop exists and get its location
    const shop = await db.get('SELECT * FROM shops WHERE id = ?', [shopId]);
    if (!shop) {
      console.error('[DISPATCH API] Shop not found:', shopId);
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }
    console.log('[DISPATCH API] Shop found:', shop.name);

    console.log('[DISPATCH API] Pre-checking driver capacity...');
    // Pre-check driver capacity before any DB changes
    try {
      const activeAssignments = await db.get(`
        SELECT COUNT(*) as count FROM driver_assignments 
        WHERE driver_id = ? AND status NOT IN ('delivered', 'cancelled')
      `, [consistentDriverId]);
      
      const activeCount = activeAssignments?.count || 0;
      
      // Fetch dynamic limits
      let maxOrders = 1;
      let motorbikeLimit = 3;
      let carLimit = 5;
      let vanLimit = 10;
      let truckLimit = 20;

      try {
        const motorbikeSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_motorbike']);
        const carSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_car']);
        const vanSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_van']);
        const truckSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_truck']);
        if (motorbikeSetting) motorbikeLimit = parseInt(motorbikeSetting.value);
        if (carSetting) carLimit = parseInt(carSetting.value);
        if (vanSetting) vanLimit = parseInt(vanSetting.value);
        if (truckSetting) truckLimit = parseInt(truckSetting.value);
      } catch (e) {}

      if (driver.vehicleType === 'motorbike') maxOrders = motorbikeLimit;
      else if (driver.vehicleType === 'car') maxOrders = carLimit;
      else if (driver.vehicleType === 'van') maxOrders = vanLimit;
      else if (driver.vehicleType === 'truck') maxOrders = truckLimit;

      if (activeCount >= maxOrders) {
        console.error(`[DISPATCH API] Capacity exceeded: ${activeCount}/${maxOrders}`);
        return NextResponse.json({ 
          error: `Driver ${driver.name} is at maximum capacity (${maxOrders} orders).`,
          details: `Active orders: ${activeCount}`
        }, { status: 400 });
      }
    } catch (capacityError: any) {
      console.error('[DISPATCH API] Error checking capacity:', capacityError);
      // Continue if we can't check, the lib will check again
    }

    console.log('[DISPATCH API] Creating driver assignment...');
    // Create driver assignment using our unified lib
    try {
      await assignOrderToDriver(
        consistentDriverId,
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
      console.log('[DISPATCH API] Driver assignment created successfully');
    } catch (assignmentError: any) {
      console.error('[DISPATCH API] Failed to create driver assignment:', assignmentError);
      return NextResponse.json({ 
        error: assignmentError.message || 'Failed to create driver assignment',
        details: assignmentError.message 
      }, { status: 400 }); // User error usually (capacity)
    }

    console.log('[DISPATCH API] Creating dispatch record...');
    // Create dispatch record
    let dispatchResult;
    let dispatchId;
    try {
      dispatchResult = await db.run(`
        INSERT INTO order_dispatches (
          order_id, driver_id, shop_id, tracking_number, estimated_delivery_time, 
          transport_cost, notes, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned', ?)
      `, [orderId, numericDriverId, shopId, trackingNumber, estimatedDeliveryTime, transportCost, notes, authResult.username]);

      dispatchId = dispatchResult.lastID;
      console.log('[DISPATCH API] Dispatch record created with ID:', dispatchId);
    } catch (dispatchError: any) {
      console.error('[DISPATCH API] Failed to create dispatch record:', dispatchError);
      return NextResponse.json({ error: 'Failed to create dispatch record' }, { status: 500 });
    }

    console.log('[DISPATCH API] Updating order status and driver status...');
    // Final state updates
    try {
      await db.run('BEGIN TRANSACTION');
      
      // Update order
      await db.run('UPDATE ecommerce_orders SET status = ?, trackingNumber = ?, shopId = ?, dispatchDate = CURRENT_TIMESTAMP WHERE id = ?',
        ['in_transit', trackingNumber, shopId, orderId]);
        
      // Update driver
      await updateDriver(consistentDriverId, { status: 'busy' });
      
      await db.run('COMMIT');
      console.log('[DISPATCH API] Order and Driver status updated successfully');
    } catch (finalStateError: any) {
      await db.run('ROLLBACK');
      console.error('[DISPATCH API] Failed to update final states:', finalStateError);
      return NextResponse.json({ error: 'Failed to finalize order status' }, { status: 500 });
    }

    console.log('[DISPATCH API] Reducing inventory...');
    // Reduce inventory from the selected shop
    try {
      const orderItems = await db.all('SELECT productVariantId, quantity FROM ecommerce_order_items WHERE orderId = ?', [orderId]);
      
      for (const item of orderItems) {
        await reduceShopInventoryStock(shopId, item.productVariantId, item.quantity);
      }
      console.log('[DISPATCH API] Inventory reduced successfully');
    } catch (inventoryError: any) {
      console.error('[DISPATCH API] Failed to reduce inventory:', inventoryError);
      // Don't fail the whole process for inventory issues
    }

      // existingOrder is already fetched at the beginning of the function

    console.log('[DISPATCH API] Sending driver notification...');
    // Send notification to the driver
    try {
      if (driver.userId) {
        const notificationId = `NOTIF-DRV-${Date.now()}`;
        await db.run(`
          INSERT INTO notifications (
            id, user_id, type, title, message, order_id, is_read, created_at
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
        console.log('[DISPATCH API] Driver notification sent successfully');
      }
    } catch (notificationError: any) {
      console.error('[DISPATCH API] Failed to send driver notification:', notificationError);
      // Don't fail the whole process for notification issues
    }

    console.log('[DISPATCH API] Retrieving final dispatch record...');
    // Get the complete dispatch record
    let newDispatch;
    try {
      newDispatch = await db.get(`
        SELECT od.*, d.userId, d.vehicleType,
               e.name as employee_name, e.phone as driver_phone, e.profilePicture
        FROM order_dispatches od
        JOIN drivers d ON od.driver_id = d.id
        LEFT JOIN employees e ON d.employeeId = e.employeeId
        WHERE od.id = ?
      `, [dispatchId]);
      console.log('[DISPATCH API] Final dispatch record retrieved successfully');
    } catch (finalError: any) {
      console.error('[DISPATCH API] Failed to retrieve final dispatch record:', finalError);
      // Return success but with limited data
      return NextResponse.json({ 
        success: true, 
        message: 'Driver assigned successfully (partial data retrieval)' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      dispatch: newDispatch,
      message: 'Driver assigned successfully'
    });

  } catch (error: any) {
    console.error('[DISPATCH API] Error assigning driver:', error);
    console.error('[DISPATCH API] Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
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

    const db = await getDb();

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    let query = `
      SELECT od.*, d.userId, d.vehicleType,
             e.name as employee_name, e.phone as driver_phone,
             o.order_id as order_number, o.customer_name, o.total_amount
      FROM order_dispatches od
      JOIN drivers d ON od.driver_id = d.id
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

  } catch (error: any) {
    console.error('[DISPATCH API] Error fetching dispatches:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}