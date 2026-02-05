
import { NextRequest, NextResponse } from 'next/server';
import { logProduction, getProductionLogs } from '@/lib/hr';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const orderId = searchParams.get('orderId') || undefined;
    const date = searchParams.get('date') || undefined;
    
    const logs = await getProductionLogs({ employeeId, orderId, date });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error in GET /api/hr/production-logs:', error);
    return NextResponse.json({ error: 'Failed to fetch production logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const id = await logProduction(data);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error in POST /api/hr/production-logs:', error);
    return NextResponse.json({ error: 'Failed to log production' }, { status: 500 });
  }
}
