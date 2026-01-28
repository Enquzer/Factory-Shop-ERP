import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

interface BOMItem {
  materialName: string;
  materialId: string;
  quantity: number;
  unit: string;
  type: string;
  color?: string;
  cost?: number;
}

interface BOMRequest {
  orderId: string;
  items: BOMItem[];
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'planning' && user.role !== 'factory' && user.role !== 'store')) {
      return NextResponse.json({ error: 'Unauthorized: Planning, Factory, or Store access required' }, { status: 403 });
    }

    const { orderId, items }: BOMRequest = await request.json();

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: orderId or items' }, { status: 400 });
    }

    const db = await getDb();

    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    let itemsRequested = 0;

    for (const item of items) {
      const { materialName, materialId, quantity, unit, type, color, cost } = item;

      if (!materialName || !quantity) {
        console.warn(`Skipping item due to missing materialName or quantity:`, item);
        continue;
      }

      // Check if the material exists in the raw materials table
      const existingMaterial = await db.get(
        'SELECT id FROM raw_materials WHERE name = ?',
        [materialName]
      );

      let materialIdToUse = existingMaterial?.id;
      
      // If the material doesn't exist in raw materials, create a temporary entry
      if (!materialIdToUse) {
        materialIdToUse = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Insert temporary material record
        await db.run(
          `INSERT INTO raw_materials 
           (id, name, category, unitOfMeasure, currentBalance, minimumStockLevel, costPerUnit, supplier, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            materialIdToUse,
            materialName,
            type || 'Other',
            unit || 'unit',
            0, // current balance - will be updated when store issues materials
            0, // minimum stock level
            cost || 0, // cost per unit
            'Temporary Entry' // supplier
          ]
        );
      }

      // Create a material requisition for the order
      const reqId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      await db.run(`
        INSERT INTO material_requisitions 
        (id, orderId, materialId, quantityRequested, status, requestedDate, type, color)
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
      `, [
        reqId,
        orderId,
        materialIdToUse,
        quantity,
        'Pending',
        type || 'Other',
        color || null
      ]);

      itemsRequested++;
    }

    // Commit transaction
    await db.run('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: 'BOM request created successfully',
      itemsRequested
    });
  } catch (error: any) {
    console.error('Error creating BOM request:', error);
    
    // Rollback transaction if there was an error
    try {
      const db = await getDb();
      await db.run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    return NextResponse.json({ error: error.message || 'Failed to create BOM request' }, { status: 500 });
  }
}