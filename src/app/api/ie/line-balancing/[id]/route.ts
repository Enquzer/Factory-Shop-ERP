import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getLineBalanceDetails } from '@/lib/ie-line-balancing';

// GET /api/ie/line-balancing/[id] - Get line balance details
export const GET = withRoleAuth(async (request, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const lineBalanceId = parseInt(id);

    if (isNaN(lineBalanceId)) {
      return NextResponse.json(
        { error: 'Invalid line balance ID' },
        { status: 400 }
      );
    }

    const lineBalance = await getLineBalanceDetails(lineBalanceId);
    
    if (!lineBalance) {
      return NextResponse.json(
        { error: 'Line balance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: lineBalance 
    });
  } catch (error) {
    console.error('Error fetching line balance details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch line balance details' },
      { status: 500 }
    );
  }
}, ['ie_admin', 'ie_user']);