import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const period = searchParams.get('period') || '7days';

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Calculate days based on period
    const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;

    // Get ATV (Average Transaction Value) per day
    const atvData = await db.all(
      `SELECT 
        DATE(createdAt) as period,
        ROUND(AVG(finalAmount), 2) as value
       FROM pos_sales
       WHERE shopId = ?
       AND DATE(createdAt) >= DATE('now', '-${days} days')
       GROUP BY DATE(createdAt)
       ORDER BY DATE(createdAt) ASC`,
      [shopId]
    );

    // Get UPT (Units Per Transaction) per day
    const uptData = await db.all(
      `SELECT 
        DATE(s.createdAt) as period,
        ROUND(CAST(SUM(json_extract(value, '$.quantity')) AS REAL) / COUNT(DISTINCT s.id), 2) as value
       FROM pos_sales s,
       json_each(s.items)
       WHERE s.shopId = ?
       AND DATE(s.createdAt) >= DATE('now', '-${days} days')
       GROUP BY DATE(s.createdAt)
       ORDER BY DATE(s.createdAt) ASC`,
      [shopId]
    );

    // Get Conversion Rate per day (transactions / visitors * 100)
    const conversionData = await db.all(
      `SELECT 
        DATE(s.createdAt) as period,
        ROUND(CAST(COUNT(DISTINCT s.id) AS REAL) / NULLIF(COALESCE(v.count, 1), 0) * 100, 1) as value
       FROM pos_sales s
       LEFT JOIN pos_visitors v ON DATE(s.createdAt) = v.date AND s.shopId = v.shopId
       WHERE s.shopId = ?
       AND DATE(s.createdAt) >= DATE('now', '-${days} days')
       GROUP BY DATE(s.createdAt)
       ORDER BY DATE(s.createdAt) ASC`,
      [shopId]
    );

    // Get Visitors per day
    const visitorsData = await db.all(
      `SELECT 
        date as period,
        count as value
       FROM pos_visitors
       WHERE shopId = ?
       AND DATE(date) >= DATE('now', '-${days} days')
       ORDER BY date ASC`,
      [shopId]
    );

    // Get Best Selling Products
    const bestSellingProducts = await db.all(
      `SELECT 
        json_extract(value, '$.productCode') as productCode,
        SUM(json_extract(value, '$.quantity')) as quantity,
        MAX(json_extract(value, '$.productCode')) as name
       FROM pos_sales,
       json_each(items)
       WHERE shopId = ?
       AND DATE(createdAt) >= DATE('now', '-${days} days')
       GROUP BY json_extract(value, '$.productCode')
       ORDER BY quantity DESC
       LIMIT 10`,
      [shopId]
    );

    // Format dates for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return NextResponse.json({
      atv: atvData.map((row: any) => ({
        period: formatDate(row.period),
        value: row.value || 0
      })),
      upt: uptData.map((row: any) => ({
        period: formatDate(row.period),
        value: row.value || 0
      })),
      conversionRate: conversionData.map((row: any) => ({
        period: formatDate(row.period),
        value: row.value || 0
      })),
      visitors: visitorsData.map((row: any) => ({
        period: formatDate(row.period),
        value: row.value || 0
      })),
      bestSellingProducts: bestSellingProducts.map((row: any) => ({
        productCode: row.productCode || 'Unknown',
        quantity: parseInt(row.quantity) || 0,
        name: row.name || row.productCode || 'Unknown Product'
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
