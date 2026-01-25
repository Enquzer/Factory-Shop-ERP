import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { names, productCode } = await request.json();

    if (!names || !Array.isArray(names)) {
      return NextResponse.json({ error: 'Names array is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if components already exist
    const existing = await db.all('SELECT id FROM marketing_order_components WHERE orderId = ?', [id]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Components already initialized' }, { status: 400 });
    }

    // Get order details to find productCode if not provided
    let finalProductCode = productCode;
    if (!finalProductCode) {
      const order = await db.get('SELECT productCode FROM marketing_orders WHERE id = ?', [id]);
      finalProductCode = order?.productCode;
    }

    const standardOps = [
      { name: 'Cutting', seq: 10 },
      { name: 'Sewing', seq: 20 },
      { name: 'Finishing', seq: 30 },
      { name: 'Packing', seq: 40 }
    ];

    for (const name of names) {
      await db.run(`INSERT INTO marketing_order_components (orderId, componentName) VALUES (?, ?)`, [id, name]);
      
      if (finalProductCode) {
        for (const op of standardOps) {
          await db.run(`
            INSERT INTO operation_bulletins (orderId, productCode, sequence, operationName, componentName, machineType, smv, manpower)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [id, finalProductCode, op.seq, op.name, name, 'Standard', 0, 0]);
        }
      }
    }

    return NextResponse.json({ message: 'Components initialized successfully' });
  } catch (error: any) {
    console.error('Error initializing components:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
