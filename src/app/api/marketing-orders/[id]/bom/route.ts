import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'planning' && user.role !== 'factory' && user.role !== 'marketing')) {
      return NextResponse.json({ error: 'Unauthorized: Planning, Factory, or Marketing access required' }, { status: 403 });
    }

    const { bomItems } = await request.json();
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    if (!bomItems || !Array.isArray(bomItems)) {
      return NextResponse.json({ error: 'BOM items must be a valid array' }, { status: 400 });
    }

    const db = await getDb();

    // First, delete existing BOM items for this order
    await db.run('DELETE FROM order_bom WHERE orderId = ?', [orderId]);

    // Insert the new BOM items
    for (const item of bomItems) {
      await db.run(`
        INSERT INTO order_bom 
        (orderId, materialId, materialName, quantityPerUnit, wastagePercentage, unitOfMeasure, type, supplier, cost, color, calculatedTotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.materialId || '',
        item.materialName || '',
        item.quantityPerUnit || 0,
        item.wastagePercentage || 0,
        item.unitOfMeasure || '',
        item.type || 'Fabric',
        item.supplier || '',
        item.cost || 0,
        item.color || '',
        item.calculatedTotal || 0
      ]);
    }

    return NextResponse.json({ success: true, message: 'BOM items saved successfully' });
  } catch (error: any) {
    console.error('Error saving BOM items:', error);
    return NextResponse.json({ error: error.message || 'Failed to save BOM items' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'planning' && user.role !== 'factory' && user.role !== 'marketing')) {
      return NextResponse.json({ error: 'Unauthorized: Planning, Factory, or Marketing access required' }, { status: 403 });
    }

    const orderId = params.id;
    const db = await getDb();

    // Fetch BOM items for the order
    const bomItems = await db.all('SELECT * FROM order_bom WHERE orderId = ?', [orderId]);

    return NextResponse.json(bomItems);
  } catch (error: any) {
    console.error('Error fetching BOM items:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch BOM items' }, { status: 500 });
  }
}