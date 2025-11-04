import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// GET /api/factory-stock - Get factory stock for a specific product variant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productVariantId = searchParams.get('variantId');
    
    if (!productVariantId) {
      return NextResponse.json({ error: 'Product variant ID is required' }, { status: 400 });
    }
    
    const db = await getDb();
    
    // Get the factory stock for this variant
    const variant = await db.get(`
      SELECT stock, productId
      FROM product_variants 
      WHERE id = ?
    `, productVariantId);
    
    if (!variant) {
      return NextResponse.json({ error: 'Product variant not found' }, { status: 404 });
    }
    
    // Get product information for notifications
    const product = await db.get(`
      SELECT p.name, pv.color, pv.size, p.minimumStockLevel
      FROM products p
      JOIN product_variants pv ON p.id = pv.productId
      WHERE pv.id = ?
    `, productVariantId);
    
    // Check if stock is at or below minimum level and create notification if needed
    if (product && variant.stock <= product.minimumStockLevel) {
      // Check if we've already created a notification for this variant
      const existingNotification = await db.get(`
        SELECT id FROM notifications 
        WHERE userType = 'factory' 
        AND title = 'Low Stock Alert' 
        AND description LIKE ? 
        AND isRead = 0
      `, `%Product "${product.name}" (${product.color}, ${product.size}) stock is at ${variant.stock}, which is at or below the minimum level of ${product.minimumStockLevel}.%`);
      
      // Only create notification if one doesn't already exist
      if (!existingNotification) {
        try {
          await createNotification({
            userType: 'factory',
            title: `Low Stock Alert`,
            description: `Product "${product.name}" (${product.color}, ${product.size}) stock is at ${variant.stock}, which is at or below the minimum level of ${product.minimumStockLevel}.`,
            href: `/products`,
          });
        } catch (notificationError) {
          console.error('Failed to create low stock notification:', notificationError);
        }
      }
    }
    
    return NextResponse.json({ factoryStock: variant.stock });
  } catch (error) {
    console.error('Error fetching factory stock:', error);
    return NextResponse.json({ error: 'Failed to fetch factory stock' }, { status: 500 });
  }
}