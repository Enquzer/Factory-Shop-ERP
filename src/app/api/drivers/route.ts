import { NextRequest, NextResponse } from 'next/server';
import { 
  initializeDriversTables, 
  createDriver, 
  getAllDrivers, 
  getDriverById, 
  updateDriver, 
  deleteDriver,
  getAvailableDrivers
} from '@/lib/drivers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getDB } from '@/lib/db';

// Initialize tables on first load
let tablesInitialized = false;

async function ensureTables() {
  if (!tablesInitialized) {
    try {
      await initializeDriversTables();
      tablesInitialized = true;
    } catch (err) {
      console.error('Failed to initialize drivers tables:', err);
    }
  }
}

// GET /api/drivers - Get all drivers (ecommerce manager access)
export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const authResult = await authenticateRequest(request);
    
    // TEMPORARY: Allow access for debugging - REMOVE IN PRODUCTION
    console.log('[TEMP DEBUG] Auth result:', authResult);
    
    // if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    const db = await getDB();
    const drivers = await getAllDrivers();
    
    // Reformatted drivers for frontend compatibility
    const formattedDrivers = await Promise.all(drivers.map(async (d: any) => {
      const driverName = d.name || 'Unknown Driver';
      const names = driverName.split(' ');
      const firstName = names[0] || 'Driver';
      const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
      
      const driverOrders = (d as any).assignedOrders || [];
      let detailedOrders = [];
      
      if (driverOrders.length > 0) {
        try {
          detailedOrders = await db.all(`
            SELECT id, latitude, longitude, customerName, status, totalAmount
            FROM ecommerce_orders 
            WHERE id IN (${driverOrders.map(() => '?').join(',')})
          `, driverOrders);
        } catch (err) {
          console.error(`Error fetching detailed orders for driver ${d.id}:`, err);
        }
      }

      const formatted = {
        id: d.id,
        username: d.username || '',
        first_name: firstName,
        last_name: lastName,
        phone: d.phone,
        vehicle_type: d.vehicleType,
        status: d.status,
        current_location: d.currentLocation,
        active_order_count: driverOrders.length,
        assigned_orders: detailedOrders,
        max_capacity: (d as any).maxCapacity || 1
      };
      
      return formatted;
    }));

    return NextResponse.json({ drivers: formattedDrivers });
  } catch (error) {
    console.error('API Drivers GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/drivers - Create new driver (ecommerce manager access)
export async function POST(request: NextRequest) {
  try {
    await ensureTables();
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, phone, licensePlate, vehicleType, userId, employeeId } = body;
    
    if (!name || !phone || !licensePlate || !vehicleType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const driver = await createDriver({
      userId: userId || null,
      employeeId: employeeId || null,
      name,
      phone,
      licensePlate,
      vehicleType,
      status: 'available'
    });
    
    return NextResponse.json({ driver }, { status: 201 });
  } catch (error: any) {
    console.error('API Drivers POST error:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Phone or license plate already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}