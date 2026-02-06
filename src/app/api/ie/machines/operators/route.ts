import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  getOperatorAssignments,
  createOperatorAssignment,
  updateOperatorAssignment,
  getAvailableOperators
} from '@/lib/ie-machines';

// GET /api/ie/machines/operators - Get operator assignments
export const GET = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || undefined;
    const available = searchParams.get('available') === 'true';
    
    if (available) {
      const operators = await getAvailableOperators();
      return NextResponse.json({ data: operators });
    }
    
    const assignments = await getOperatorAssignments(orderId);
    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error('Error fetching operator assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// POST /api/ie/machines/operators - Create operator assignment
export const POST = withRoleAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { orderId, machineId, operatorId, operationCode, startDate, endDate, status, efficiencyRating } = body;
    
    // Validate required fields
    if (!orderId || !machineId || !operatorId || !operationCode || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newAssignmentId = await createOperatorAssignment({
      orderId,
      machineId,
      operatorId,
      operationCode,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'active',
      efficiencyRating: efficiencyRating || 0,
      createdBy: user.username
    });
    
    return NextResponse.json({ id: newAssignmentId, message: 'Operator assigned successfully' });
  } catch (error) {
    console.error('Error creating operator assignment:', error);
    return NextResponse.json({ error: 'Failed to assign operator' }, { status: 500 });
  }
}, 'ie_admin');

// GET /api/ie/machines/operators/available - Get available operators
export const GET_AVAILABLE = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const skillRequired = searchParams.get('skill') || undefined;
    
    const operators = await getAvailableOperators(skillRequired);
    return NextResponse.json({ data: operators });
  } catch (error) {
    console.error('Error fetching available operators:', error);
    return NextResponse.json({ error: 'Failed to fetch operators' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);