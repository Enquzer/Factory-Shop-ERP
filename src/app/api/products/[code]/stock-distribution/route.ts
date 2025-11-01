import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/products-sqlite';
import { getShopInventory } from '@/lib/shop-inventory-sqlite';
import { withAuth } from '@/lib/auth-middleware';
import { processFactoryStockDistribution, processShopStockDistribution } from '@/lib/stock-distribution';

// GET /api/products/[code]/stock-distribution?shopId=SHOP_ID
export async function GET(request: Request, { params }: { params: { code: string } }) {
  return withAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const shopId = searchParams.get('shopId');
      const productCode = params.code;
      
      // Get the product by code
      const products = await getProducts();
      const product = products.find(p => p.productCode === productCode);
      
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      // If shopId is provided and user is a shop, return shop-specific data
      if (shopId && user.role === 'shop') {
        const shopInventory = await getShopInventory(shopId);
        const distributionData = processShopStockDistribution(shopInventory, productCode);
        
        return NextResponse.json({
          productCode,
          chartType: 'bar',
          ...distributionData
        });
      }
      
      // Otherwise return factory data
      const distributionData = processFactoryStockDistribution(product);
      
      return NextResponse.json({
        productCode,
        chartType: 'bar',
        ...distributionData
      });
    } catch (error) {
      console.error('Error fetching stock distribution data:', error);
      return NextResponse.json({ error: 'Failed to fetch stock distribution data' }, { status: 500 });
    }
  });
}