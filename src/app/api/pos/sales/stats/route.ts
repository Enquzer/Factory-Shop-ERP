import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const date = searchParams.get('date');

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Get sales for the specific date
    const sales = await db.all(
      `SELECT * FROM pos_sales 
       WHERE shopId = ? AND DATE(createdAt) = ? 
       ORDER BY createdAt DESC`,
      [shopId, date]
    );

    // Parse items from JSON
    const salesWithItems = sales.map((sale: any) => ({
      ...sale,
      items: JSON.parse(sale.items)
    }));

    // Calculate total sales
    const totalSales = salesWithItems.reduce((sum: number, sale: any) => sum + sale.finalAmount, 0);

    // Calculate items sold
    const itemsSold = salesWithItems.reduce((sum: number, sale: any) => 
      sum + sale.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    );

    // Number of transactions
    const transactions = salesWithItems.length;

    // Get unique products sold
    const uniqueProducts = new Set();
    salesWithItems.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        uniqueProducts.add(item.productCode || item.productVariantId);
      });
    });
    const uniqueProductsSold = uniqueProducts.size;

    // Calculate ATV (Average Transaction Value)
    const atv = transactions > 0 ? totalSales / transactions : 0;

    // Calculate UPT (Units Per Transaction)
    const upt = transactions > 0 ? itemsSold / transactions : 0;

    // Get visitor count for the date
    const visitorData = await db.get(
      `SELECT count FROM pos_visitors WHERE shopId = ? AND date = ?`,
      [shopId, date]
    );
    const visitors = visitorData?.count || 0;

    // Calculate foot traffic conversion rate
    const footTrafficConversion = visitors > 0 ? (transactions / visitors) * 100 : 0;

    // Get best selling products
    const productSales: { [key: string]: { quantity: number; totalSales: number; product: any } } = {};
    
    salesWithItems.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        const productKey = item.productCode || item.productVariantId;
        if (!productSales[productKey]) {
          productSales[productKey] = {
            quantity: 0,
            totalSales: 0,
            product: item
          };
        }
        productSales[productKey].quantity += item.quantity;
        productSales[productKey].totalSales += item.quantity * item.price;
      });
    });

    // Sort by quantity and take top 3
    const bestSellingProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 3)
      .map((item: any) => ({
        name: item.product.name,
        productId: item.product.productCode || item.product.productId || '',
        color: item.product.color || '',
        size: item.product.size || '',
        category: '', // Would need to join with products table to get category
        quantity: item.quantity,
        totalSales: item.totalSales,
        imageUrl: item.product.imageUrl || ''
      }));

    return NextResponse.json({
      totalSales,
      itemsSold,
      transactions,
      visitors,
      uniqueProductsSold,
      atv,
      upt,
      footTrafficConversion,
      bestSellingProducts
    });
  } catch (error) {
    console.error('Error fetching POS stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}