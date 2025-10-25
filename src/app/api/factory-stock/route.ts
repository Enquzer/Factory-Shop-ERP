import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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
      SELECT stock 
      FROM product_variants 
      WHERE id = ?
    `, productVariantId);
    
    if (!variant) {
      return NextResponse.json({ error: 'Product variant not found' }, { status: 404 });
    }
    
    return NextResponse.json({ factoryStock: variant.stock });
  } catch (error) {
    console.error('Error fetching factory stock:', error);
    return NextResponse.json({ error: 'Failed to fetch factory stock' }, { status: 500 });
  }
}