
import { NextResponse, NextRequest } from 'next/server';
import { issueMaterial } from '@/lib/bom';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    console.log('=== Material Issue Request ===');
    console.log('User:', user ? { id: user.id, username: user.username, role: user.role } : 'null');
    
    if (!user) {
      console.log('Authentication failed: No user found');
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }
    
    console.log(`Checking role: ${user.role} against allowed roles: ['store', 'factory']`);
    
    if (user.role !== 'store' && user.role !== 'factory') {
      console.log(`Access denied for role: ${user.role}`);
      return NextResponse.json({ 
        error: `Unauthorized: Store or Factory access required. Your role: ${user.role}` 
      }, { status: 403 });
    }

    console.log('Role check passed');

    const { requisitionId, quantity } = await request.json();
    if (!requisitionId || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    console.log(`Issuing material: requisitionId=${requisitionId}, quantity=${quantity}`);
    await issueMaterial(requisitionId, quantity);
    
    console.log('Material issued successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error issuing material:', error);
    return NextResponse.json({ error: error.message || 'Failed to issue material' }, { status: 500 });
  }
}
