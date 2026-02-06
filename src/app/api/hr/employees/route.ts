import { NextRequest, NextResponse } from 'next/server';
import { getEmployees, createEmployee, updateEmployee, getNextEmployeeId, getJobCenters } from '@/lib/hr';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('nextId') === 'true') {
      const id = await getNextEmployeeId();
      return NextResponse.json({ id });
    }
    if (searchParams.get('jobCenters') === 'true') {
      const centers = await getJobCenters();
      return NextResponse.json(centers);
    }
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
