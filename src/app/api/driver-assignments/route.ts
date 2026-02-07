import { NextRequest, NextResponse } from 'next/server';
import { 
  assignOrderToDriver,
  getDriverAssignments,
  updateAssignmentStatus
} from '@/lib/drivers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

// POST /api/driver-assignments - Assign order to driver (ecommerce manager access)
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { driverId, orderId, pickupLocation, deliveryLocation } = body;
    
    if (!driverId || !orderId || !pickupLocation || !deliveryLocation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const assignment = await assignOrderToDriver(
      driverId, 
      orderId, 
      authResult.username, 
      pickupLocation, 
      deliveryLocation
    );
    
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    console.error('API Driver Assignments POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/driver-assignments - Get assignments (authenticated access)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    
    // If driver is requesting their own assignments
    if (authResult.role !== 'ecommerce' && authResult.role !== 'admin') {
      // Regular users can only see their own assignments
      if (!driverId || driverId !== authResult.username) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    if (!driverId) {
      return NextResponse.json({ error: 'driverId parameter required' }, { status: 400 });
    }
    
    const assignments = await getDriverAssignments(driverId);
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('API Driver Assignments GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}