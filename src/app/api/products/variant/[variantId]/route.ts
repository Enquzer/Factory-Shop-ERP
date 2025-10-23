import { NextResponse } from 'next/server';
import { updateVariantStock } from '@/lib/products-sqlite';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/products/variant/:variantId - Update variant stock
export async function PUT(request: Request, { params }: { params: { variantId: string } }) {
  try {
    const { newStock } = await request.json();
    
    if (newStock === undefined) {
      return NextResponse.json({ error: 'newStock is required' }, { status: 400 });
    }
    
    // Get current variant and product info before updating
    const db = await getDb();
    const variant = await db.get(`
      SELECT pv.stock, p.minimumStockLevel, p.name, pv.color, pv.size
      FROM product_variants pv
      JOIN products p ON pv.productId = p.id
      WHERE pv.id = ?
    `, params.variantId);
    
    const success = await updateVariantStock(params.variantId, newStock);
    
    if (success) {
      // Check if stock is at or below minimum level and create notification
      if (variant && newStock <= variant.minimumStockLevel) {
        // Create low stock notification for factory
        await createNotification({
          userType: 'factory',
          title: `Low Stock Alert`,
          description: `Product "${variant.name}" (${variant.color}, ${variant.size}) stock is at ${newStock}, which is at or below the minimum level of ${variant.minimumStockLevel}.`,
          href: `/products`,
        });
      }
      
      return NextResponse.json({ message: 'Variant stock updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update variant stock' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating variant stock:', error);
    return NextResponse.json({ error: 'Failed to update variant stock' }, { status: 500 });
  }
}