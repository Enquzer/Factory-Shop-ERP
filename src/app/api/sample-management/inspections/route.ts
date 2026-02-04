
import { NextRequest, NextResponse } from 'next/server';
import { requestSampleQC, getSampleInspections } from '@/lib/sample-qc';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const inspections = await getSampleInspections(productId || undefined);
    return NextResponse.json(inspections);
  } catch (error) {
    console.error('Error fetching inspections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, sampleType, styleId } = await req.json();
    if (!productId || !sampleType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const inspectionId = await requestSampleQC(productId, sampleType, styleId);
    return NextResponse.json({ success: true, id: inspectionId });
  } catch (error) {
    console.error('Error requesting sample QC:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
