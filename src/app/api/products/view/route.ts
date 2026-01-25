import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/products-sqlite';
import { getShopById } from '@/lib/shops-sqlite';
import { withAuth } from '@/lib/auth-middleware';

// GET /api/products/view - Get products with variant visibility control
export async function GET(request: Request) {
  return withAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const shopId = searchParams.get('shopId');
      
      // Only shop users should use this endpoint with variant visibility control
      if (user.role !== 'shop' || !shopId) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      }
      
      // Get the shop to check visibility settings
      const shop = await getShopById(shopId);
      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }
      
      // Get all products that are ready to deliver
      const products = (await getProducts()).filter(product => product.readyToDeliver === 1);
      
      // Always return variants so shop can see availability (even if they can't select individually)
      // The frontend will handle the "view only" logic based on shop.showVariantDetails
      const productsWithDetails = products.map(product => {
        // Calculate total available stock for this product
        const totalAvailable = product.variants.reduce((sum, variant) => sum + variant.stock, 0);

        return {
          id: product.id, // Ensure ID is included
          productCode: product.productCode,
          name: product.name,
          category: product.category,
          price: product.price,
          totalAvailable,
          variants: product.variants.map(variant => ({
            id: variant.id,
            color: variant.color,
            size: variant.size,
            stock: variant.stock,
            imageUrl: variant.imageUrl
          }))
        };
      });
      
      return NextResponse.json({
        products: productsWithDetails
      });
    } catch (error) {
      console.error('Error fetching products with visibility control:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
  });
}