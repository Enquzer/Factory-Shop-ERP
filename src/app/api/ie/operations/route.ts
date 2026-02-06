import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  getIEOperations, 
  getIEOperationByCode, 
  createIEOperation, 
  updateIEOperation, 
  deleteIEOperation,
  getOperationCategories,
  searchIEOperations
} from '@/lib/ie';

// GET /api/ie/operations - Get all IE operations
export const GET = withRoleAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const isActive = searchParams.get('isActive') === 'false' ? false : true;
    const search = searchParams.get('search') || undefined;
    
    let operations;
    if (search) {
      operations = await searchIEOperations(search);
    } else {
      operations = await getIEOperations(category, isActive);
    }
    
    return NextResponse.json(operations);
  } catch (error) {
    console.error('Error fetching IE operations:', error);
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// POST /api/ie/operations - Create new IE operation
export const POST = withRoleAuth(async (request) => {
  try {
    const body = await request.json();
    const { opCode, operationName, category, description, standardSMV, 
            machineType, skillLevelRequired, complexity, department, isActive } = body;
    
    // Validate required fields
    if (!opCode || !operationName || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const newOperationId = await createIEOperation({
      opCode,
      operationName,
      category,
      description: description || '',
      standardSMV: standardSMV || 0,
      machineType: machineType || '',
      skillLevelRequired: skillLevelRequired || 'Beginner',
      complexity: complexity || 1,
      department: department || '',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: 'system' // This should come from the authenticated user
    });
    
    return NextResponse.json({ id: newOperationId, message: 'Operation created successfully' });
  } catch (error: any) {
    console.error('Error creating IE operation:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Operation code already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create operation' }, { status: 500 });
  }
}, 'ie_admin');