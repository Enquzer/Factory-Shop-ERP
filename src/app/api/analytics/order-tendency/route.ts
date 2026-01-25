import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    // 1. Get all order items with their variant details (size/color)
    // joining with product_variants gives us the attributes
    const orderTendencies = await db.all(`
      SELECT 
        pv.size, 
        pv.color, 
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN product_variants pv ON oi.variantId = pv.id
      GROUP BY pv.size, pv.color
    `);

    // 2. Aggregate by size
    const sizeTendency: Record<string, number> = {};
    let totalUnits = 0;

    orderTendencies.forEach((item: any) => {
      const q = Number(item.total_quantity);
      sizeTendency[item.size] = (sizeTendency[item.size] || 0) + q;
      totalUnits += q;
    });

    // 3. Aggregate by color
    const colorTendency: Record<string, number> = {};
    orderTendencies.forEach((item: any) => {
      const q = Number(item.total_quantity);
      colorTendency[item.color] = (colorTendency[item.color] || 0) + q;
    });

    // 4. Calculate Percentages
    const sizePercentages = Object.entries(sizeTendency).map(([size, quantity]) => ({
      size,
      quantity,
      percentage: totalUnits > 0 ? (quantity / totalUnits) * 100 : 0
    })).sort((a: any, b: any) => b.percentage - a.percentage);

    const colorPercentages = Object.entries(colorTendency).map(([color, quantity]) => ({
      color,
      quantity,
      percentage: totalUnits > 0 ? (quantity / totalUnits) * 100 : 0
    })).sort((a: any, b: any) => b.percentage - a.percentage);

    // 5. Variant breakdown percentages (Normalized to 100%)
    const variantPercentages = orderTendencies.map((item: any) => ({
       size: item.size,
       color: item.color,
       quantity: item.total_quantity,
       percentage: totalUnits > 0 ? (item.total_quantity / totalUnits) * 100 : 0
    })).sort((a: any, b: any) => b.percentage - a.percentage);

    // 6. Get CURRENT Factory Inventory (Available Stock)
    const factoryStock = await db.all(`
      SELECT 
        color, 
        size, 
        SUM(stock) as current_stock
      FROM product_variants
      GROUP BY color, size
    `);

    const colorStock: Record<string, number> = {};
    const sizeStock: Record<string, number> = {};
    let totalStock = 0;

    factoryStock.forEach((s: any) => {
      const q = Number(s.current_stock);
      colorStock[s.color] = (colorStock[s.color] || 0) + q;
      sizeStock[s.size] = (sizeStock[s.size] || 0) + q;
      totalStock += q;
    });

    return NextResponse.json({
      totalUnits,
      sizePercentages,
      colorPercentages,
      variantPercentages,
      inventory: {
        totalStock,
        colorStock,
        sizeStock,
        variantStock: factoryStock.map((s: any) => ({
          color: s.color,
          size: s.size,
          quantity: s.current_stock
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching order tendency:', error);
    return NextResponse.json({ error: 'Failed to fetch tendency data' }, { status: 500 });
  }
}
