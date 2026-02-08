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
    console.log('[TEMP DEBUG] Request headers:', Object.fromEntries(request.headers));
    
    // if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    
    console.log('[API] About to call getAllDrivers()...');
    const drivers = await getAllDrivers();
    console.log(`[API] getAllDrivers() returned ${drivers.length} drivers`);
    console.log('[API] Raw drivers from lib:', JSON.stringify(drivers, null, 2));
    
    // Reformatted drivers for frontend compatibility
    const formattedDrivers = drivers.map(d => {
      const driverName = d.name || 'Unknown Driver';
      const names = driverName.split(' ');
      const firstName = names[0] || 'Driver';
      const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
      
      const formatted = {
        id: d.id, // Now a string from lib
        username: d.username || '',
        first_name: firstName,
        last_name: lastName,
        phone: d.phone,
        vehicle_type: d.vehicleType,
        status: d.status,
        current_location: d.currentLocation,
        active_order_count: (d as any).activeOrderCount || 0,
        max_capacity: (d as any).maxCapacity || 1
      };
      
      console.log(`[API] Formatted driver ${d.id}:`, {
        id: formatted.id,
        first_name: formatted.first_name,
        last_name: formatted.last_name,
        status: formatted.status,
        vehicle_type: formatted.vehicle_type
      });
      
      return formatted;
    });

    console.log(`[API] Formatted ${formattedDrivers.length} drivers`);
    const availableDrivers = formattedDrivers.filter(d => d.status === 'available');
    console.log(`[API] Returning ${availableDrivers.length} available drivers out of ${formattedDrivers.length} total`);
    console.log('[API] Available drivers:', availableDrivers.map(d => ({id: d.id, name: `${d.first_name} ${d.last_name}`, status: d.status})));
    console.log('[API] Final response:', JSON.stringify({ drivers: formattedDrivers }, null, 2));
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