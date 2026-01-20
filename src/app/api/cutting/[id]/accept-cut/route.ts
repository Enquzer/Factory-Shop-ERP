import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { acceptCutPanels } from '@/lib/cutting';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.hasRole(['factory', 'sewing'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { sewingResponsiblePerson } = body;

    await acceptCutPanels(id, user.username, sewingResponsiblePerson);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting cut panels:', error);
    return NextResponse.json(
      { error: 'Failed to accept cut panels' },
      { status: 500 }
    );
  }
}