import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { notifySewingOfCuttingCompletion } from '@/lib/cutting';

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
    await notifySewingOfCuttingCompletion(id, user.username);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error notifying sewing of cutting completion:', error);
    return NextResponse.json(
      { error: 'Failed to notify sewing of cutting completion' },
      { status: 500 }
    );
  }
}