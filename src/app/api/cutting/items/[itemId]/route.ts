import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { updateCuttingItemFromDB } from '@/lib/cutting';

export async function PUT(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.hasRole(['factory', 'cutting', 'quality_inspection'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const itemId = parseInt(params.itemId);
    const updates = await req.json();

    await updateCuttingItemFromDB(itemId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cutting item:', error);
    return NextResponse.json(
      { error: 'Failed to update cutting item' },
      { status: 500 }
    );
  }
}
