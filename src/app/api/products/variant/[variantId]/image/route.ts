import { NextResponse } from 'next/server';
import { updateVariantImage } from '@/lib/products-sqlite';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/products/variant/:variantId/image - Update variant image
export async function PUT(request: Request, { params }: { params: { variantId: string } }) {
  try {
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }
    
    // Get database connection
    const db = await getDb();
    
    // Get variant and product info before updating
    const variant = await db.get(`
      SELECT p.name, pv.color, pv.size, p.id as productId
      FROM product_variants pv
      JOIN products p ON pv.productId = p.id
      WHERE pv.id = ?
    `, params.variantId);
    
    const success = await updateVariantImage(params.variantId, imageUrl);
    
    if (success) {
      // Create notification for shops that have this variant in their inventory
      if (variant) {
        // Get all shops that have this product variant in their inventory
        const shopsWithVariant = await db.all(`
          SELECT shopId FROM shop_inventory WHERE productVariantId = ?
        `, params.variantId);
        
        // Create notification for each shop
        for (const shop of shopsWithVariant) {
          await createNotification({
            userType: 'shop',
            shopId: shop.shopId,
            title: 'Product Variant Updated',
            description: `Product "${variant.name}" (${variant.color}, ${variant.size}) image has been updated.`,
            href: '/shop/inventory',
          });
        }
      }
      
      return NextResponse.json({ message: 'Variant image updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update variant image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating variant image:', error);
    return NextResponse.json({ error: 'Failed to update variant image' }, { status: 500 });
  }
}