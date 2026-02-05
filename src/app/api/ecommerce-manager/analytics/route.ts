import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getShopEcommerceAnalytics, getOverallEcommerceAnalytics } from '@/lib/ecommerce-manager';

// GET /api/ecommerce-manager/analytics - Get eCommerce analytics
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin' && authResult.role !== 'factory')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    let analytics;
    if (shopId) {
      analytics = await getShopEcommerceAnalytics(shopId, start, end);
    } else {
      analytics = await getOverallEcommerceAnalytics(start, end);
    }
    
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error fetching ecommerce analytics:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
