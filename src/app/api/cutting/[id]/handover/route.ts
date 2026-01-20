import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { handoverToProductionFromDB } from '@/lib/cutting';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.hasRole(['factory', 'cutting'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { productionReceivedBy } = body;

    if (!productionReceivedBy) {
      return NextResponse.json(
        { error: 'Production receiver name is required' },
        { status: 400 }
      );
    }

    await handoverToProductionFromDB(id, user.username, productionReceivedBy);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handing over to production:', error);
    return NextResponse.json(
      { error: 'Failed to handover to production' },
      { status: 500 }
    );
  }
}
