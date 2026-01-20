import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { 
  getCuttingRecordByIdFromDB, 
  completeCuttingFromDB,
  qcCheckCuttingFromDB,
  handoverToProductionFromDB
} from '@/lib/cutting';

// GET /api/cutting/[id] - Get specific cutting record
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.hasRole(['factory', 'cutting', 'planning', 'sewing', 'quality_inspection'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const id = parseInt(params.id);
    const record = await getCuttingRecordByIdFromDB(id);
    
    if (!record) {
      return NextResponse.json({ error: 'Cutting record not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching cutting record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cutting record' },
      { status: 500 }
    );
  }
}

// POST /api/cutting/[id]/complete - Mark cutting as completed
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
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === 'complete') {
      await completeCuttingFromDB(id, user.username);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error completing cutting:', error);
    return NextResponse.json(
      { error: 'Failed to complete cutting' },
      { status: 500 }
    );
  }
}
