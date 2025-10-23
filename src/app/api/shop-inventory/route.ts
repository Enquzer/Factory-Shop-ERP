import { NextResponse } from 'next/server';
import { getShopInventory } from '@/lib/shop-inventory-sqlite';
import { getShopByUsername } from '@/lib/shops';

// GET /api/shop-inventory - Get shop inventory for the authenticated user
export async function GET(request: Request) {
  try {
    // Get the authenticated user from localStorage/session (client-side)
    // For API routes, we'll need to pass the username as a query parameter
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    // Get shop by username
    const shop = await getShopByUsername(username);
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }
    
    // Get shop inventory
    const inventory = await getShopInventory(shop.id);
    
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error fetching shop inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch shop inventory' }, { status: 500 });
  }
}