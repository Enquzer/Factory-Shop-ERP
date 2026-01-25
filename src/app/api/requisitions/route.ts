
import { NextResponse, NextRequest } from 'next/server';
import { getMaterialRequisitionsForOrder } from '@/lib/bom';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');

  try {
    const db = await getDb();
    
    let query = `
      SELECT r.*, rm.name as materialName, rm.unitOfMeasure, rm.currentBalance, mo.orderNumber, mo.productName
      FROM material_requisitions r
      JOIN raw_materials rm ON r.materialId = rm.id
      JOIN marketing_orders mo ON r.orderId = mo.id
    `;
    const params: any[] = [];

    if (orderId) {
      query += ` WHERE r.orderId = ?`;
      params.push(orderId);
    } else if (status) {
      query += ` WHERE r.status = ?`;
      params.push(status);
    } else {
      // Default to pending for store
      query += ` WHERE r.status != 'Completed'`;
    }

    query += ` ORDER BY r.requestedDate DESC`;

    const requisitions = await db.all(query, params);
    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
