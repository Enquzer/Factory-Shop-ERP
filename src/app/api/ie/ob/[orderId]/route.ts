import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { 
  getCombinedOB, 
  convertPlanningToIEOB, 
  syncIEOBToPlanning,
  getOrdersWithOB,
  createIEOBFromLibrary
} from '@/lib/ie-ob-integration';

// GET /api/ie/ob/[orderId] - Get combined OB (IE priority, fallback to Planning)
export const GET = withRoleAuth(async (request, user, { params }: { params: { orderId: string } }) => {
  try {
    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    const obData = await getCombinedOB(orderId);
    
    return NextResponse.json(obData);
  } catch (error) {
    console.error('Error fetching combined OB:', error);
    return NextResponse.json({ error: 'Failed to fetch operation bulletin' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user']);

// POST /api/ie/ob/[orderId]/convert - Convert Planning OB to IE OB for editing
export const POST = withRoleAuth(async (request, user, { params }: { params: { orderId: string } }) => {
  try {
    const { orderId } = params;
    const { productCode } = await request.json();
    
    if (!orderId || !productCode) {
      return NextResponse.json({ error: 'Order ID and Product Code are required' }, { status: 400 });
    }
    
    const result = await convertPlanningToIEOB(orderId, productCode, user.username);
    
    if (result.success) {
      return NextResponse.json({ message: result.message });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error converting Planning OB:', error);
    return NextResponse.json({ error: 'Failed to convert operation bulletin' }, { status: 500 });
  }
}, 'ie_admin');

// PUT /api/ie/ob/[orderId]/sync - Sync IE OB back to Planning system
export const PUT = withRoleAuth(async (request, user, { params }: { params: { orderId: string } }) => {
  try {
    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    const result = await syncIEOBToPlanning(orderId);
    
    if (result.success) {
      return NextResponse.json({ message: result.message });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error('Error syncing IE OB:', error);
    return NextResponse.json({ error: 'Failed to sync operation bulletin' }, { status: 500 });
  }
}, 'ie_admin');