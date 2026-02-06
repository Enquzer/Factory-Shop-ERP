import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getOrdersWithOB } from '@/lib/ie-ob-integration';

// GET /api/ie/ob/orders - Get all orders with operation bulletins
export const GET = withRoleAuth(async (request) => {
  try {
    const orders = await getOrdersWithOB();
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders with OB:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);