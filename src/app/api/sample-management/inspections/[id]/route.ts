
import { NextRequest, NextResponse } from 'next/server';
import { getSampleInspectionById, updateSampleInspection } from '@/lib/sample-qc';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inspection = await getSampleInspectionById(params.id);
    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }
    return NextResponse.json(inspection);
  } catch (error) {
    console.error('Error fetching inspection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const success = await updateSampleInspection(params.id, data);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating inspection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
