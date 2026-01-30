import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getHandoversByRecordIdFromDB } from '@/lib/cutting';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const recordId = parseInt(params.id);
    const handovers = await getHandoversByRecordIdFromDB(recordId);
    return NextResponse.json(handovers);
  } catch (error) {
    console.error('Error fetching handovers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
