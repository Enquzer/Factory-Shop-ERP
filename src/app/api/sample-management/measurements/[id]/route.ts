
import { NextRequest, NextResponse } from 'next/server';
import { updateSampleMeasurement } from '@/lib/sample-qc';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actualMeasurement } = await req.json();
    const success = await updateSampleMeasurement(params.id, actualMeasurement);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating measurement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
