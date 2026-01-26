import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const last7Days = new Date(Date.now() - 604800000).toISOString().split('T')[0];

    // 1. Today's Sales Summary
    const todaySales = await db.all(
      `SELECT * FROM pos_sales WHERE shopId = ? AND date(createdAt) = ?`,
      [shopId, today]
    );

    const todayTotalSales = todaySales.reduce((sum: number, sale: any) => sum + sale.finalAmount, 0);
    const todayTransactionCount = todaySales.length;

    // 2. Yesterday's Sales Summary
    const yesterdaySales = await db.all(
      `SELECT * FROM pos_sales WHERE shopId = ? AND date(createdAt) = ?`,
      [shopId, yesterday]
    );

    const yesterdayTotalSales = yesterdaySales.reduce((sum: number, sale: any) => sum + sale.finalAmount, 0);

    // 3. Best Selling Products (Top 10)
    const bestSellers = await db.all(
      `SELECT json_each.value AS productData, 
              json_each.key AS productKey
       FROM pos_sales, json_each(pos_sales.items) 
       WHERE pos_sales.shopId = ? 
       AND date(pos_sales.createdAt) >= ?
       GROUP BY json_extract(json_each.value, '$.productCode')
       ORDER BY SUM(json_extract(json_each.value, '$.quantity')) DESC
       LIMIT 10`,
      [shopId, last7Days]
    );

    // 4. Daily Sales Flow (Last 30 days)
    const dailySales = await db.all(
      `SELECT date(createdAt) as date, 
              SUM(finalAmount) as totalSales,
              COUNT(*) as transactionCount
       FROM pos_sales 
       WHERE shopId = ? 
       AND date(createdAt) >= date('now', '-30 days')
       GROUP BY date(createdAt)
       ORDER BY date(createdAt) DESC`,
      [shopId]
    );

    // 5. ATV (Average Transaction Value)
    const totalSalesAllTime = await db.get(
      `SELECT SUM(finalAmount) as total, COUNT(*) as count FROM pos_sales WHERE shopId = ?`,
      [shopId]
    );

    const atv = totalSalesAllTime?.count > 0 
      ? totalSalesAllTime.total / totalSalesAllTime.count 
      : 0;

    // 6. UPT (Units Per Transaction)
    const totalItemsSold = await db.get(
      `SELECT SUM(json_extract(item.value, '$.quantity')) as total
       FROM pos_sales, json_each(pos_sales.items) as item
       WHERE pos_sales.shopId = ?`,
      [shopId]
    );

    const upt = todayTransactionCount > 0 
      ? (totalItemsSold?.total || 0) / todayTransactionCount 
      : 0;

    // 7. Visitor Data
    const todayVisitors = await db.get(
      `SELECT count FROM pos_visitors WHERE shopId = ? AND date = ?`,
      [shopId, today]
    );

    const totalVisitors = await db.get(
      `SELECT SUM(count) as total FROM pos_visitors WHERE shopId = ? AND date >= ?`,
      [shopId, last7Days]
    );

    // 8. Foot Traffic Conversion Rate
    const conversionRate = (todayVisitors?.count || 0) > 0 
      ? (todayTransactionCount / (todayVisitors?.count || 1)) * 100 
      : 0;

    return NextResponse.json({
      summary: {
        todaySales: todayTotalSales,
        todayTransactions: todayTransactionCount,
        yesterdaySales: yesterdayTotalSales,
        salesGrowth: yesterdayTotalSales > 0 
          ? ((todayTotalSales - yesterdayTotalSales) / yesterdayTotalSales) * 100 
          : 0
      },
      metrics: {
        atv: parseFloat(atv.toFixed(2)),
        upt: parseFloat(upt.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        totalVisitors: totalVisitors?.total || 0
      },
      bestSellers: bestSellers.map((item: any) => {
        try {
          const product = JSON.parse(item.productData);
          return {
            productCode: product.productCode,
            name: product.name,
            quantity: product.quantity,
            totalRevenue: product.price * product.quantity
          };
        } catch {
          return null;
        }
      }).filter(Boolean),
      dailySales: dailySales.map((day: any) => ({
        date: day.date,
        totalSales: day.totalSales,
        transactionCount: day.transactionCount
      }))
    });
  } catch (error) {
    console.error('Error fetching POS dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}