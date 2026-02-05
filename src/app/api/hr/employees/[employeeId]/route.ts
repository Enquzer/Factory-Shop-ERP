import { NextRequest, NextResponse } from 'next/server';
import { getDb, resetDbCache } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const db = await getDb();
    
    await db.run('DELETE FROM employees WHERE employeeId = ?', [employeeId]);
    resetDbCache();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const db = await getDb();
    
    const employee = await db.get('SELECT * FROM employees WHERE employeeId = ?', [employeeId]);
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      ...employee,
      skills: employee.skills ? JSON.parse(employee.skills) : []
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { employeeId } = params;
    const updates = await req.json();
    const db = await getDb();
    
    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => f === 'skills' ? JSON.stringify(updates[f]) : updates[f]);
    
    await db.run(`UPDATE employees SET ${setClause} WHERE employeeId = ?`, [...values, employeeId]);
    resetDbCache();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
