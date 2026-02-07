import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getMaintenanceSchedules, createMaintenanceSchedule, getMaintenanceStats, getMachineMaintenanceHistory } from '@/lib/ie-maintenance';

export const GET = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const machineId = searchParams.get('machineId');
    
    if (machineId) {
      const history = await getMachineMaintenanceHistory(parseInt(machineId));
      return NextResponse.json({ data: history });
    }

    if (type === 'stats') {
      const stats = await getMaintenanceStats();
      return NextResponse.json({ data: stats });
    }
    
    const schedules = await getMaintenanceSchedules();
    return NextResponse.json({ data: schedules });
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance data' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user', 'admin']);

export const POST = withRoleAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { machineId, maintenanceType, scheduledDate, notes } = body;
    
    if (!machineId || !maintenanceType || !scheduledDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newId = await createMaintenanceSchedule({
      machineId,
      maintenanceType,
      scheduledDate,
      status: 'Scheduled',
      notes: notes || '',
      performedBy: user.username
    });
    
    return NextResponse.json({ id: newId, message: 'Maintenance scheduled successfully' });
  } catch (error) {
    console.error('Error creating maintenance schedule:', error);
    return NextResponse.json({ error: 'Failed to create maintenance schedule' }, { status: 500 });
  }
}, 'ie_admin');
