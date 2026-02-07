import { NextRequest, NextResponse } from 'next/server';
import { 
  getDriverAssignmentById,
  updateAssignmentStatus
} from '@/lib/drivers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/driver-assignments/[id] - Get specific assignment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const assignment = await getDriverAssignmentById(id);
    
    // Check if user can access this assignment
    if (authResult.role !== 'ecommerce' && authResult.role !== 'admin') {
      // Regular users can only access assignments for their own driver ID
      if (assignment.driverId !== authResult.username) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    return NextResponse.json({ assignment });
  } catch (error: any) {
    console.error('API Driver Assignment GET error:', error);
    if (error.message === 'Driver assignment not found') {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/driver-assignments/[id] - Update assignment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    const { status } = body;
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }
    
    // Validate status
    const validStatuses = ['accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    // Get assignment to verify access
    const assignment = await getDriverAssignmentById(id);
    
    // Check permissions
    if (authResult.role !== 'ecommerce' && authResult.role !== 'admin') {
      // Drivers can only update their own assignments
      if (assignment.driverId !== authResult.username) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // Drivers can only update to certain statuses
      const driverAllowedStatuses = ['accepted', 'picked_up', 'in_transit', 'delivered'];
      if (!driverAllowedStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status for driver' }, { status: 400 });
      }
    }
    
    const timestamp = new Date();
    const success = await updateAssignmentStatus(id, status as any, timestamp);
    
    if (success) {
      const updatedAssignment = await getDriverAssignmentById(id);
      return NextResponse.json({ assignment: updatedAssignment });
    } else {
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }
  } catch (error) {
    console.error('API Driver Assignment PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}