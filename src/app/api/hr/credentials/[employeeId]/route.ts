import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

// DELETE /api/hr/credentials/[employeeId] - Remove credentials from employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { employeeId } = params;
    
    const db = await getDB();
    
    // Get employee to find associated user
    const employee = await db.get('SELECT userId FROM employees WHERE employeeId = ?', [employeeId]);
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    
    if (!employee.userId) {
      return NextResponse.json({ error: 'Employee has no credentials assigned' }, { status: 400 });
    }
    
    // Delete the user account
    await db.run('DELETE FROM users WHERE id = ?', [employee.userId]);
    
    // Remove userId reference from employee
    await db.run('UPDATE employees SET userId = NULL WHERE employeeId = ?', [employeeId]);
    
    return NextResponse.json({ message: 'Credentials removed successfully' });
  } catch (error) {
    console.error('API HR Credentials DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}