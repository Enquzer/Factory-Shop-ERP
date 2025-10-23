import { NextResponse } from 'next/server';
import { getShopByUsername } from '@/lib/shops';

// GET /api/shops/[username] - Get shop by username
export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    const shop = await getShopByUsername(username);
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }
    
    // Return the shop data
    const cleanShop = {
      id: shop.id,
      username: shop.username,
      name: shop.name,
      contactPerson: shop.contactPerson,
      city: shop.city,
      exactLocation: shop.exactLocation,
      discount: shop.discount,
      status: shop.status,
      monthlySalesTarget: shop.monthlySalesTarget
    };
    
    const response = NextResponse.json(cleanShop);
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching shop:', error);
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
  }
}