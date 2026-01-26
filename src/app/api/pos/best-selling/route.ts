import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const limit = searchParams.get('limit') || '5';

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();

    // Get all transactions for the shop
    const transactions = await db.all(`
      SELECT items FROM pos_sales WHERE shopId = ?
    `, [shopId]);

    // Parse items and count quantities
    const productCounts: { [key: string]: { name: string; color: string; size: string; quantity: number; totalSales: number; imageUrl?: string } } = {};

    transactions.forEach((transaction: any) => {
      try {
        const items = JSON.parse(transaction.items);
        items.forEach((item: any) => {
          const key = `${item.name}-${item.color}-${item.size}`;
          if (!productCounts[key]) {
            productCounts[key] = {
              name: item.name,
              color: item.color || 'N/A',
              size: item.size || 'N/A',
              quantity: 0,
              totalSales: 0,
              imageUrl: item.imageUrl
            };
          }
          productCounts[key].quantity += item.quantity || 0;
          productCounts[key].totalSales += (item.price || 0) * (item.quantity || 0);
        });
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Convert to array and sort by quantity
    const bestSelling = Object.values(productCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, parseInt(limit))
      .map((item, index) => ({
        ...item,
        productId: `PRD-${index}`, // Placeholder ID
        category: 'General' // Placeholder category
      }));

    return NextResponse.json(bestSelling);
  } catch (error) {
    console.error('Error fetching best selling products:', error);
    return NextResponse.json({ error: 'Failed to fetch best selling products' }, { status: 500 });
  }
}