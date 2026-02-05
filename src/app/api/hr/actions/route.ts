
import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeActions, createEmployeeAction } from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId') || undefined;
  
  try {
    const actions = await getEmployeeActions(employeeId);
    return NextResponse.json(actions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createEmployeeAction(body);
    return NextResponse.json({ success: true, id: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
