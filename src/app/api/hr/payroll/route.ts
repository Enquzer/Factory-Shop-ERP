
import { NextResponse } from 'next/server';
import { generateMonthlyPayroll } from '@/lib/hr';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month) {
    return NextResponse.json({ error: 'Month is required (YYYY-MM)' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const existing = await db.all(`
      SELECT p.*, e.name, e.jobCenter, e.joinedDate 
      FROM payroll_records p 
      JOIN employees e ON p.employeeId = e.employeeId 
      WHERE p.month = ?
    `, [month]);
    
    if (existing.length > 0) {
      return NextResponse.json(existing);
    }

    const payroll = await generateMonthlyPayroll(month);
    // After generating, we need to fetch again with joins to get employee names etc.
    const withDetails = await db.all(`
      SELECT p.*, e.name, e.jobCenter, e.joinedDate 
      FROM payroll_records p 
      JOIN employees e ON p.employeeId = e.employeeId 
      WHERE p.month = ?
    `, [month]);

    return NextResponse.json(withDetails);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { month } = body;

  try {
    const payroll = await generateMonthlyPayroll(month);
    return NextResponse.json({ message: 'Payroll generated successfully', count: payroll.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
