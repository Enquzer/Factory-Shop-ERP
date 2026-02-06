import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getWorkstations, createWorkstation, updateWorkstation } from '@/lib/ie-line-balancing';

// GET /api/ie/line-balancing/workstations - Get all workstations
export const GET = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || undefined;

    const workstations = await getWorkstations(section);
    
    return NextResponse.json({ 
      success: true, 
      data: workstations 
    });
  } catch (error) {
    console.error('Error fetching workstations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workstations' },
      { status: 500 }
    );
  }
}, ['ie_admin', 'ie_user']);

// POST /api/ie/line-balancing/workstations - Create new workstation
export const POST = withRoleAuth(async (request) => {
  try {
    const body = await request.json();
    const { workstationCode, workstationName, section, capacity, status, machineId, operatorId } = body;

    if (!workstationCode || !workstationName || !section) {
      return NextResponse.json(
        { error: 'Missing required fields: workstationCode, workstationName, section' },
        { status: 400 }
      );
    }

    const workstationId = await createWorkstation({
      workstationCode,
      workstationName,
      section,
      capacity: capacity || 0,
      status: status || 'available',
      machineId: machineId || null,
      operatorId: operatorId || null,
      assignedOperations: [],
      smv: 0,
      efficiency: 0,
      targetEfficiency: 85,
      createdBy: 'system'
    });

    return NextResponse.json({
      success: true,
      data: { id: workstationId }
    });
  } catch (error: any) {
    console.error('Error creating workstation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workstation' },
      { status: 500 }
    );
  }
}, ['ie_admin']);