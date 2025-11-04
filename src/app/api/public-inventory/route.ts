import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/products-sqlite';

// GET /api/public-inventory - Get aggregated inventory levels by category
export async function GET() {
  try {
    // Fetch only ready-to-deliver products for public display
    const allProducts = await getProducts();
    const publicProducts = allProducts.filter(product => product.readyToDeliver === 1);
    
    // Get general inventory levels (aggregated by category)
    const inventoryLevels: Record<string, { totalItems: number; totalStock: number }> = {};
    
    publicProducts.forEach(product => {
      if (!inventoryLevels[product.category]) {
        inventoryLevels[product.category] = {
          totalItems: 0,
          totalStock: 0
        };
      }
      
      // Increment item count
      inventoryLevels[product.category].totalItems += 1;
      
      // Add stock count
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      inventoryLevels[product.category].totalStock += totalStock;
    });
    
    // Convert to array format for easier consumption
    const inventoryArray = Object.entries(inventoryLevels).map(([category, data]) => ({
      category,
      totalItems: data.totalItems,
      totalStock: data.totalStock
    }));
    
    const response = NextResponse.json({
      inventory: inventoryArray,
      lastUpdated: new Date().toISOString()
    });
    
    // Add cache control headers (cache for 30 minutes)
    response.headers.set('Cache-Control', 'public, max-age=1800');
    response.headers.set('Expires', new Date(Date.now() + 1800000).toUTCString());
    
    return response;
  } catch (error) {
    console.error('Error fetching public inventory data:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory data' }, { status: 500 });
  }
}