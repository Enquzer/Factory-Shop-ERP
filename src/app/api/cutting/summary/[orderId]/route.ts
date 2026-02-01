import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getCuttingOrderSummaryFromDB } from '@/lib/cutting';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow factory, cutting, planning, sewing, quality_inspection roles
    if (!user.hasRole(['factory', 'cutting', 'planning', 'sewing', 'quality_inspection'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orderId = params.orderId;
    const summary = await getCuttingOrderSummaryFromDB(orderId);
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching cutting order summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cutting order summary' },
      { status: 500 }
    );
  }
}