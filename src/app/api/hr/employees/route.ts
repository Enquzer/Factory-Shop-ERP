
import { NextRequest, NextResponse } from 'next/server';
import { getEmployees, createEmployee, updateEmployee } from '@/lib/hr';

export async function GET() {
  try {
    const employees = await getEmployees();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error in GET /api/hr/employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const id = await createEmployee(data);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error in POST /api/hr/employees:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();
    const { employeeId, ...updates } = data;
    await updateEmployee(employeeId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/hr/employees:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
