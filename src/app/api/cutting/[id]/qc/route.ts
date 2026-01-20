import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { qcCheckCuttingFromDB } from '@/lib/cutting';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.hasRole(['factory', 'quality_inspection', 'cutting'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { passed, remarks } = body;

    await qcCheckCuttingFromDB(id, passed, remarks || '', user.username);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error QC checking cutting:', error);
    return NextResponse.json(
      { error: 'Failed to QC check cutting' },
      { status: 500 }
    );
  }
}
