import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { updateMaintenanceSchedule, deleteMaintenanceSchedule } from '@/lib/ie-maintenance';

export const PUT = withRoleAuth(async (request, user, context) => {
  try {
    const { id } = context.params;
    const body = await request.json();
    
    const success = await updateMaintenanceSchedule(parseInt(id), body);
    
    if (success) {
      return NextResponse.json({ message: 'Maintenance record updated successfully' });
    } else {
      return NextResponse.json({ error: 'Maintenance record not found or no changes made' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    return NextResponse.json({ error: 'Failed to update maintenance record' }, { status: 500 });
  }
}, 'ie_admin');

export const DELETE = withRoleAuth(async (request, user, context) => {
  try {
    const { id } = context.params;
    const success = await deleteMaintenanceSchedule(parseInt(id));
    
    if (success) {
      return NextResponse.json({ message: 'Maintenance record deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance record' }, { status: 500 });
  }
}, 'ie_admin');
