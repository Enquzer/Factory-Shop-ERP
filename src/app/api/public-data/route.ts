import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/products-sqlite';
import { getAllShops } from '@/lib/shops-sqlite';
import { getDb } from '@/lib/db';

// GET /api/public-data - Get non-confidential company data for public website
export async function GET() {
  try {
    // Fetch only ready-to-deliver products for public display
    const allProducts = await getProducts();
    const publicProducts = allProducts.filter(product => product.readyToDeliver === 1);

    // Fetch only active shops for public display
    const allShops = await getAllShops();
    const publicShops = allShops.filter(shop => shop.status === 'Active');

    // Get general inventory levels (aggregated by category)
    const inventoryLevels: Record<string, number> = {};

    publicProducts.forEach(product => {
      if (!inventoryLevels[product.category]) {
        inventoryLevels[product.category] = 0;
      }
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      inventoryLevels[product.category] += totalStock;
    });

    // Get shop locations data (including location and contact for public display)
    const shopLocations = publicShops.map(shop => ({
      id: shop.id,
      name: shop.name,
      city: shop.city,
      exactLocation: shop.exactLocation,
      contactPhone: shop.contactPhone,
      username: shop.username,
    }));

    // Get company statistics
    const db = await getDb();

    // Get total products count
    const totalProductsResult = await db.get(`
      SELECT COUNT(*) as count FROM products 
      WHERE readyToDeliver = 1
    `);

    // Get total shops count
    const totalShopsResult = await db.get(`
      SELECT COUNT(*) as count FROM shops 
      WHERE status = 'Active'
    `);

    // Get total orders count (completed orders only)
    const totalOrdersResult = await db.get(`
      SELECT COUNT(*) as count FROM orders 
      WHERE status = 'Delivered'
    `);

    const publicData = {
      companyInfo: {
        name: "Carement Fashion",
        description: "Premium fashion solutions connecting factories and retailers across Ethiopia",
        totalProducts: totalProductsResult?.count || 0,
        totalShops: totalShopsResult?.count || 0,
        totalOrders: totalOrdersResult?.count || 0
      },
      inventoryLevels,
      shopLocations,
      lastUpdated: new Date().toISOString()
    };

    const response = NextResponse.json(publicData);

    // Add cache control headers (cache for 1 hour)
    response.headers.set('Cache-Control', 'public, max-age=3600');
    response.headers.set('Expires', new Date(Date.now() + 3600000).toUTCString());

    return response;
  } catch (error) {
    console.error('Error fetching public data:', error);
    return NextResponse.json({ error: 'Failed to fetch public data' }, { status: 500 });
  }
}