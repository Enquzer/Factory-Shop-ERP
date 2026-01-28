import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const period = searchParams.get('period') || 'daily';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    let trends: any[] = [];

    switch (period) {
      case 'daily':
        // Last 7 days
        trends = await db.all(
          `SELECT 
            DATE(createdAt) as period,
            SUM(finalAmount) as sales,
            SUM(json_extract(value, '$.quantity')) as quantity
           FROM pos_sales,
           json_each(items)
           WHERE shopId = ?
           AND DATE(createdAt) >= DATE('now', '-7 days')
           GROUP BY DATE(createdAt)
           ORDER BY DATE(createdAt) ASC`,
          [shopId]
        );
        break;

      case 'monthly':
        // Last 12 months
        trends = await db.all(
          `SELECT 
            strftime('%Y-%m', createdAt) as period,
            SUM(finalAmount) as sales,
            SUM(json_extract(value, '$.quantity')) as quantity
           FROM pos_sales,
           json_each(items)
           WHERE shopId = ?
           AND DATE(createdAt) >= DATE('now', '-12 months')
           GROUP BY strftime('%Y-%m', createdAt)
           ORDER BY strftime('%Y-%m', createdAt) ASC`,
          [shopId]
        );
        break;

      case 'quarterly':
        // Last 4 quarters
        trends = await db.all(
          `SELECT 
            'Q' || ((CAST(strftime('%m', createdAt) AS INTEGER) - 1) / 3 + 1) || ' ' || strftime('%Y', createdAt) as period,
            SUM(finalAmount) as sales,
            SUM(json_extract(value, '$.quantity')) as quantity
           FROM pos_sales,
           json_each(items)
           WHERE shopId = ?
           AND DATE(createdAt) >= DATE('now', '-12 months')
           GROUP BY strftime('%Y', createdAt), ((CAST(strftime('%m', createdAt) AS INTEGER) - 1) / 3)
           ORDER BY strftime('%Y', createdAt) ASC, ((CAST(strftime('%m', createdAt) AS INTEGER) - 1) / 3) ASC
           LIMIT 4`,
          [shopId]
        );
        break;

      case 'annual':
        // Last 5 years
        trends = await db.all(
          `SELECT 
            strftime('%Y', createdAt) as period,
            SUM(finalAmount) as sales,
            SUM(json_extract(value, '$.quantity')) as quantity
           FROM pos_sales,
           json_each(items)
           WHERE shopId = ?
           AND DATE(createdAt) >= DATE('now', '-5 years')
           GROUP BY strftime('%Y', createdAt)
           ORDER BY strftime('%Y', createdAt) ASC`,
          [shopId]
        );
        break;
    }

    // Format the data
    const formattedTrends = trends.map((row: any) => ({
      period: formatPeriodLabel(row.period, period),
      sales: Math.round(row.sales || 0),
      quantity: parseInt(row.quantity) || 0
    }));

    return NextResponse.json({ trends: formattedTrends });
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    return NextResponse.json({ error: 'Failed to fetch sales trends' }, { status: 500 });
  }
}

function formatPeriodLabel(period: string, periodType: string): string {
  if (periodType === 'daily') {
    const date = new Date(period);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (periodType === 'monthly') {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return period;
}
