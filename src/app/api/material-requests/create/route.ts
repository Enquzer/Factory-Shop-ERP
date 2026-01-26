import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'planning' && user.role !== 'factory' && user.role !== 'store')) {
      return NextResponse.json({ error: 'Unauthorized: Planning, Factory, or Store access required' }, { status: 403 });
    }

    const { orderId, materialName, quantity, unit, status, reason } = await request.json();

    if (!orderId || !materialName || !quantity) {
      return NextResponse.json({ error: 'Missing required fields: orderId, materialName, or quantity' }, { status: 400 });
    }

    const db = await getDb();

    // Create a new material requisition for the order
    const reqId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await db.run(`
      INSERT INTO material_requisitions 
      (id, orderId, materialId, quantityRequested, status, requestedDate)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [
      reqId,
      orderId,
      materialName, // Using materialName as materialId since it's a custom request
      quantity,
      status || 'Pending'
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Material request created successfully',
      reqId 
    });
  } catch (error: any) {
    console.error('Error creating material request:', error);
    return NextResponse.json({ error: error.message || 'Failed to create material request' }, { status: 500 });
  }
}