import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { requestQCFromDB } from '@/lib/cutting';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Factory or Cutting team can request QC
  if (!user.hasRole(['factory', 'cutting'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const id = parseInt(params.id);
    await requestQCFromDB(id, user.username);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error requesting QC for cutting:', error);
    return NextResponse.json(
      { error: 'Failed to request QC' },
      { status: 500 }
    );
  }
}
