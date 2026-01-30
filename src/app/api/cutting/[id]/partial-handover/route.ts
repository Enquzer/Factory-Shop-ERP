import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createHandoverRecordFromDB, getCuttingRecordByIdFromDB } from '@/lib/cutting';
import { getMarketingOrderByIdFromDB } from '@/lib/marketing-orders';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const recordId = parseInt(params.id);
    const body = await req.json();
    const { 
      receivedBy, 
      items, 
      handoverDate, 
      qualityInspectorBy,
      cuttingSignature,
      sewingSignature,
      qualitySignature
    } = body;

    if (!receivedBy || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cuttingRecord = await getCuttingRecordByIdFromDB(recordId);
    if (!cuttingRecord) {
      return NextResponse.json({ error: 'Cutting record not found' }, { status: 404 });
    }

    const order = await getMarketingOrderByIdFromDB(cuttingRecord.orderId);
    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create the handover record
    const handoverId = await createHandoverRecordFromDB({
      cuttingRecordId: recordId,
      orderId: cuttingRecord.orderId,
      handoverDate: handoverDate || new Date().toISOString(),
      handoverBy: user.username || 'Unknown',
      receivedBy,
      qualityInspectorBy: qualityInspectorBy || null,
      cuttingSignature,
      sewingSignature,
      qualitySignature,
      items
    });

    return NextResponse.json({ success: true, id: handoverId });
  } catch (error) {
    console.error('Error in partial handover API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
