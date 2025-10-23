import { NextResponse } from 'next/server';
import { updateShopInventoryOnReplenishment } from '@/lib/products-sqlite';

// POST /api/products/variant/:variantId/replenish - Update shop inventory when product stock is replenished
export async function POST(request: Request, { params }: { params: { variantId: string } }) {
  try {
    const { productId, quantityAdded } = await request.json();
    
    if (!productId || quantityAdded === undefined) {
      return NextResponse.json({ error: 'productId and quantityAdded are required' }, { status: 400 });
    }
    
    const success = await updateShopInventoryOnReplenishment(productId, params.variantId, quantityAdded);
    
    if (success) {
      return NextResponse.json({ message: 'Shop inventory updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update shop inventory' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating shop inventory on replenishment:', error);
    return NextResponse.json({ error: 'Failed to update shop inventory' }, { status: 500 });
  }
}