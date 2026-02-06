import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  getMachineById,
  updateMachine,
  deleteMachine
} from '@/lib/ie-machines';

// GET /api/ie/machines/[id] - Get machine by ID
export const GET = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const machineId = parseInt(id);
    
    if (isNaN(machineId)) {
      return NextResponse.json({ error: 'Invalid machine ID' }, { status: 400 });
    }
    
    const machine = await getMachineById(machineId);
    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }
    
    return NextResponse.json(machine);
  } catch (error) {
    console.error('Error fetching machine:', error);
    return NextResponse.json({ error: 'Failed to fetch machine' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// PUT /api/ie/machines/[id] - Update machine
export const PUT = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const machineId = parseInt(id);
    
    if (isNaN(machineId)) {
      return NextResponse.json({ error: 'Invalid machine ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const success = await updateMachine(machineId, body);
    
    if (success) {
      return NextResponse.json({ message: 'Machine updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating machine:', error);
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
  }
}, 'ie_admin');

// DELETE /api/ie/machines/[id] - Delete machine
export const DELETE = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const machineId = parseInt(id);
    
    if (isNaN(machineId)) {
      return NextResponse.json({ error: 'Invalid machine ID' }, { status: 400 });
    }
    
    const success = await deleteMachine(machineId);
    if (success) {
      return NextResponse.json({ message: 'Machine deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting machine:', error);
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
  }
}, 'ie_admin');