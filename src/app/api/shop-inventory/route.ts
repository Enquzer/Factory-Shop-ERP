import { NextResponse } from 'next/server';
import { getShopInventory, updateShopInventoryItemStock, removeItemsFromShopInventory } from '@/lib/shop-inventory-sqlite';
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

// PUT /api/shop-inventory - Update shop inventory item stock
export async function PUT(request: Request) {
  try {
    const { username, productVariantId, newStock } = await request.json();
    
    if (!username || !productVariantId || newStock === undefined) {
      return NextResponse.json({ error: 'Username, productVariantId, and newStock are required' }, { status: 400 });
    }
    
    // Get shop by username
    const shop = await getShopByUsername(username);
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }
    
    // Update shop inventory item stock
    const success = await updateShopInventoryItemStock(shop.id, productVariantId, newStock);
    
    if (success) {
      return NextResponse.json({ message: 'Stock updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating shop inventory:', error);
    return NextResponse.json({ error: 'Failed to update shop inventory' }, { status: 500 });
  }
}

// DELETE /api/shop-inventory - Remove items from shop inventory
export async function DELETE(request: Request) {
  try {
    const { username, productVariantIds } = await request.json();
    
    if (!username || !productVariantIds || !Array.isArray(productVariantIds)) {
      return NextResponse.json({ error: 'Username and productVariantIds array are required' }, { status: 400 });
    }
    
    // Get shop by username
    const shop = await getShopByUsername(username);
    
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }
    
    // Remove items from shop inventory
    const success = await removeItemsFromShopInventory(shop.id, productVariantIds);
    
    if (success) {
      return NextResponse.json({ message: 'Items removed successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to remove items' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error removing items from shop inventory:', error);
    return NextResponse.json({ error: 'Failed to remove items from shop inventory' }, { status: 500 });
  }
}