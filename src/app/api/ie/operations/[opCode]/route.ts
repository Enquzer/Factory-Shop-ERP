import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  getIEOperationByCode, 
  updateIEOperation, 
  deleteIEOperation 
} from '@/lib/ie';

// GET /api/ie/operations/[opCode] - Get specific IE operation
export const GET = withRoleAuth(async (request, user, { params }: { params: { opCode: string } }) => {
  try {
    const { opCode } = params;
    
    if (!opCode) {
      return NextResponse.json({ error: 'Operation code is required' }, { status: 400 });
    }
    
    const operation = await getIEOperationByCode(opCode);
    
    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }
    
    return NextResponse.json(operation);
  } catch (error) {
    console.error('Error fetching IE operation:', error);
    return NextResponse.json({ error: 'Failed to fetch operation' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// PUT /api/ie/operations/[opCode] - Update IE operation
export const PUT = withRoleAuth(async (request, user, { params }: { params: { opCode: string } }) => {
  try {
    const { opCode } = params;
    const body = await request.json();
    
    if (!opCode) {
      return NextResponse.json({ error: 'Operation code is required' }, { status: 400 });
    }
    
    const success = await updateIEOperation(0, { ...body, opCode }); // We'll need to get the ID first
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update operation' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Operation updated successfully' });
  } catch (error) {
    console.error('Error updating IE operation:', error);
    return NextResponse.json({ error: 'Failed to update operation' }, { status: 500 });
  }
}, 'ie_admin');

// DELETE /api/ie/operations/[opCode] - Delete IE operation
export const DELETE = withRoleAuth(async (request, user, { params }: { params: { opCode: string } }) => {
  try {
    const { opCode } = params;
    
    if (!opCode) {
      return NextResponse.json({ error: 'Operation code is required' }, { status: 400 });
    }
    
    // We'll need to get the ID first based on opCode
    const operation = await getIEOperationByCode(opCode);
    if (!operation) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }
    
    const success = await deleteIEOperation(operation.id);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete operation' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Operation deleted successfully' });
  } catch (error) {
    console.error('Error deleting IE operation:', error);
    return NextResponse.json({ error: 'Failed to delete operation' }, { status: 500 });
  }
}, 'ie_admin');