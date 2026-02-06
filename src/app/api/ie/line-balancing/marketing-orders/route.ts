import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getMarketingOrdersStartedSewingNotCompleted } from '@/lib/marketing-orders';

// GET /api/ie/line-balancing/marketing-orders - Get marketing orders that have started sewing but not completed
export const GET = withRoleAuth(async (request) => {
  try {
    const orders = await getMarketingOrdersStartedSewingNotCompleted();
    
    return NextResponse.json({ 
      success: true, 
      data: orders 
    });
  } catch (error) {
    console.error('Error fetching marketing orders started sewing but not completed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing orders' },
      { status: 500 }
    );
  }
}, ['ie_admin', 'ie_user']);