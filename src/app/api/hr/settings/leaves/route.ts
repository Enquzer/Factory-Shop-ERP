
import { NextRequest, NextResponse } from 'next/server';
import { getLeaveConfigs, updateLeaveConfig } from '@/lib/hr';

export async function GET() {
  try {
    const configs = await getLeaveConfigs();
    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { leaveType, ...updates } = body;
    await updateLeaveConfig(leaveType, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
