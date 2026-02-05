
import { NextRequest, NextResponse } from 'next/server';
import { getSalaryHistory, addSalaryHistory } from '@/lib/hr';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId') || undefined;
  try {
    const history = await getSalaryHistory(employeeId);
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await addSalaryHistory(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
