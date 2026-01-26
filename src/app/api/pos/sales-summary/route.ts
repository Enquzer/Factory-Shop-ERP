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

    // Get total sales and transaction count
    const salesResult = await db.get(`
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(totalAmount) as totalSales
      FROM pos_sales 
      WHERE shopId = ?
    `, [shopId]);

    // Calculate average transaction value
    const avgTransactionValue = salesResult.totalTransactions > 0 
      ? salesResult.totalSales / salesResult.totalTransactions 
      : 0;

    // Calculate units per transaction by parsing the items JSON
    const transactions = await db.all(`
      SELECT items FROM pos_sales WHERE shopId = ?
    `, [shopId]);

    let totalItems = 0;
    transactions.forEach((transaction: any) => {
      try {
        const items = JSON.parse(transaction.items);
        totalItems += items.length;
      } catch (e) {
        // Skip invalid JSON
      }
    });

    const unitsPerTransaction = salesResult.totalTransactions > 0 
      ? totalItems / salesResult.totalTransactions 
      : 0;

    return NextResponse.json({
      totalSales: salesResult.totalSales || 0,
      totalTransactions: salesResult.totalTransactions || 0,
      averageTransactionValue: avgTransactionValue,
      unitsPerTransaction: unitsPerTransaction
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return NextResponse.json({ error: 'Failed to fetch sales summary' }, { status: 500 });
  }
}