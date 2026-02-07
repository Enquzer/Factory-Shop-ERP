import { NextRequest, NextResponse } from 'next/server';
import { assignCredentialsToEmployee, getEmployeeWithoutCredentials, initializeUserIdColumn } from '@/lib/hr-credentials';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/hr/credentials/pending - Get employees without system credentials
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await initializeUserIdColumn();
    const employees = await getEmployeeWithoutCredentials();
    
    return NextResponse.json({ employees });
  } catch (error) {
    console.error('API HR Credentials GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/hr/credentials - Assign credentials to employee
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { employeeId, username, password, role = 'driver' } = body;
    
    if (!employeeId || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    
    // Validate role
    const validRoles = ['driver', 'factory', 'shop', 'store', 'finance', 'hr', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }
    
    const success = await assignCredentialsToEmployee(employeeId, username, password, role);
    
    if (success) {
      return NextResponse.json({ 
        message: 'Credentials assigned successfully',
        username: username,
        role: role
      });
    } else {
      return NextResponse.json({ error: 'Failed to assign credentials' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API HR Credentials POST error:', error);
    if (error.message?.includes('Username already exists')) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    if (error.message?.includes('Employee not found')) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}