import { NextRequest, NextResponse } from 'next/server';
import { 
  getDriverById, 
  updateDriver, 
  deleteDriver,
  getDriverAssignments
} from '@/lib/drivers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/drivers/[id] - Get specific driver
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow ecommerce and admin full access
    const hasFullAccess = authResult.role === 'ecommerce' || authResult.role === 'admin';
    
    // For drivers, only allow access to their own data
    const isSelfAccess = authResult.role === 'driver' && authResult.username === params.id;
    
    if (!hasFullAccess && !isSelfAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    let driver = null;
    let assignments = [];
    
    try {
      driver = await getDriverById(id);
    } catch (error: any) {
      if (error.message === 'Driver not found' && isSelfAccess) {
        // Auto-initialize driver record if it doesn't exist but user has the role
        await updateDriver(id, { status: 'available' });
        driver = await getDriverById(id);
      } else if (error.message === 'Driver not found') {
        return NextResponse.json({ driver: null, assignments: [] });
      } else {
        throw error;
      }
    }

    const driverActualId = driver?.id || id;
    assignments = await getDriverAssignments(driverActualId);
    
    // Fetch order details for each assignment
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    
    const assignmentsWithDetails = await Promise.all(assignments.map(async (a) => {
      // Try to find in ecommerce_orders first
      let order = await db.get(`
        SELECT customerName, customerPhone, totalAmount, deliveryAddress, trackingNumber, status as orderStatus
        FROM ecommerce_orders 
        WHERE id = ?
      `, [a.orderId]);

      if (order) {
        const items = await db.all(`
          SELECT name, quantity, price, color, size
          FROM ecommerce_order_items
          WHERE orderId = ?
        `, [a.orderId]);
        
        return { 
            ...a, 
            orderDetails: { ...order, items },
            // Ensure delivery location falls back to order address if not set in assignment
            deliveryLocation: a.deliveryLocation || {
                name: order.deliveryAddress,
                lat: 0, 
                lng: 0
            }
        };
      }

      // If not found in ecommerce_orders, try internal orders table
      order = await db.get(`
        SELECT shopName as customerName, id as trackingNumber, amount as totalAmount, status as orderStatus, shopId, items
        FROM orders 
        WHERE id = ?
      `, [a.orderId]);

      if (order) {
        // Prepare items for internal order
        let items: any[] = [];
        try {
          const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          if (Array.isArray(rawItems)) {
            items = rawItems.map((item: any) => ({
                name: item.name || item.productName || 'Unknown Item',
                quantity: item.quantity,
                price: item.price,
                color: item.variant?.color || item.color || 'N/A',
                size: item.variant?.size || item.size || 'N/A'
            }));
          }
        } catch (e) {
          console.error("Failed to parse internal order items:", e);
        }

        // Get shop address for delivery
        const shop = await db.get(`SELECT exactLocation, city FROM shops WHERE id = ?`, [order.shopId]);
        const deliveryAddress = shop ? `${shop.exactLocation}, ${shop.city}` : 'To Shop';
        
        return { 
          ...a, 
          orderDetails: { 
            ...order, 
            customerPhone: 'Shop Order',
            deliveryAddress,
            items 
          },
          deliveryLocation: a.deliveryLocation || {
             name: deliveryAddress,
             lat: 0,
             lng: 0
          }
        };
      }

      // If order not found in either table, return assignment as is
      return a;
    }));
    
    console.log(`[API /api/drivers/${id}] Found ${assignments.length} raw assignments, ${assignmentsWithDetails.length} with details`);
    return NextResponse.json({ driver, assignments: assignmentsWithDetails });
  } catch (error: any) {
    console.error('API Driver GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/drivers/[id] - Update driver
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow ecommerce and admin full access
    const hasFullAccess = authResult.role === 'ecommerce' || authResult.role === 'admin';
    
    // For drivers, allow access to their own data using username match
    // The params.id could be the driver ID or username
    let isSelfAccess = false;
    if (authResult.role === 'driver') {
      // Direct match with username
      if (authResult.username === params.id) {
        isSelfAccess = true;
      } else {
        // If not direct match, check if params.id corresponds to the authenticated user's driver record
        try {
          const driverRecord = await getDriverById(params.id);
          isSelfAccess = driverRecord && driverRecord.username === authResult.username;
        } catch (error) {
          isSelfAccess = false;
        }
      }
    }
    
    if (!hasFullAccess && !isSelfAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { id } = params;
    const body = await request.json();
    // console.log('PUT /api/drivers/[id] - Request body:', JSON.stringify(body, null, 2));
    
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.licensePlate) updateData.licensePlate = body.licensePlate;
    if (body.vehicleType) updateData.vehicleType = body.vehicleType;
    if (body.status) updateData.status = body.status;
    if (body.currentLocation) updateData.currentLocation = body.currentLocation;
    
    // console.log('PUT /api/drivers/[id] - Extracted updateData:', JSON.stringify(updateData, null, 2));
    
    const success = await updateDriver(id, updateData);
    // console.log('PUT /api/drivers/[id] - Update driver result:', success);
    
    if (success) {
      const updatedDriver = await getDriverById(id);
      return NextResponse.json({ driver: updatedDriver });
    } else {
      return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
    }
  } catch (error) {
    console.error('API Driver PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/drivers/[id] - Delete driver (ecommerce manager/admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const success = await deleteDriver(id);
    
    if (success) {
      return NextResponse.json({ message: 'Driver deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
    }
  } catch (error) {
    console.error('API Driver DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}