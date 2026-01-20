
import { NextRequest, NextResponse } from 'next/server';
import { saveMeasurements } from '@/lib/styles-sqlite';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const measurements = await req.json();
    const success = await saveMeasurements(params.id, measurements);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error saving measurements:', error);
    return NextResponse.json({ error: 'Failed to save measurements' }, { status: 500 });
  }
}
