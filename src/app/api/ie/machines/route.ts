import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachineCategories,
  getMachineTypes
} from '@/lib/ie-machines';

// GET /api/ie/machines - Get all machines
export const GET = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || 'active';
    
    const machines = await getMachines(category, status);
    return NextResponse.json({ data: machines });
  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// POST /api/ie/machines - Create new machine
export const POST = withRoleAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { machineCode, machineName, machineType, category, brand, model, 
            capacity, unit, powerRating, dimensions, weight, installationArea, 
            maintenanceSchedule, status, department, lineSection } = body;
    
    // Validate required fields
    if (!machineCode || !machineName || !machineType || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newMachineId = await createMachine({
      machineCode,
      machineName,
      machineType,
      category,
      brand: brand || '',
      model: model || '',
      capacity: capacity || 0,
      unit: unit || '',
      powerRating: powerRating || '',
      dimensions: dimensions || '',
      weight: weight || 0,
      installationArea: installationArea || '',
      maintenanceSchedule: maintenanceSchedule || '',
      status: status || 'active',
      department: department || '',
      lineSection: lineSection || '',
      createdBy: user.username
    });
    
    return NextResponse.json({ id: newMachineId, message: 'Machine created successfully' });
  } catch (error: any) {
    console.error('Error creating machine:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Machine code already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 });
  }
}, 'ie_admin');

// GET /api/ie/machines/categories - Get machine categories
export const GET_CATEGORIES = withRoleAuth(async () => {
  try {
    const categories = await getMachineCategories();
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// GET /api/ie/machines/types - Get machine types
export const GET_TYPES = withRoleAuth(async () => {
  try {
    const types = await getMachineTypes();
    return NextResponse.json({ data: types });
  } catch (error) {
    console.error('Error fetching types:', error);
    return NextResponse.json({ error: 'Failed to fetch types' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);