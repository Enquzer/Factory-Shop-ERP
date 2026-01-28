import { NextResponse } from 'next/server';
import { getRawMaterials, createRawMaterial, updateRawMaterial } from '@/lib/raw-materials';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.materialName || !data.quantity) {
      return NextResponse.json({ 
        error: 'Material name and quantity are required' 
      }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if this material already exists in raw materials
    const allMaterials = await getRawMaterials();
    const existingMaterial = allMaterials.find(m => m.name === data.materialName);

    if (existingMaterial) {
      // Update existing material - add the purchased quantity
      await updateRawMaterial(existingMaterial.id, {
        currentBalance: existingMaterial.currentBalance + data.quantity,
        costPerUnit: data.costPerUnit || existingMaterial.costPerUnit,
        supplier: data.supplier || existingMaterial.supplier,
        source: 'PURCHASED',
        purchaseRequestId: data.purchaseRequestId
      });
      
      // Mark the purchase request as registered in inventory
      if (data.purchaseRequestId) {
        await db.run(`
          UPDATE purchase_requests 
          SET status = 'Registered',
              receivedDate = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [data.purchaseRequestId]);
      }
      
      return NextResponse.json({
        success: true,
        message: `Added ${data.quantity} ${data.unitOfMeasure || 'units'} to existing ${data.materialName} inventory`,
        materialId: existingMaterial.id,
        action: 'updated',
        purchaseRequestId: data.purchaseRequestId
      });
    } else {
      // Create new material entry
      const category = data.category || 'Fabric';
      const unitOfMeasure = data.unitOfMeasure || 'units';
      const minimumStockLevel = Math.max(10, Math.floor(data.quantity * 0.1)); // 10% of quantity or 10 units
      
      const materialId = await createRawMaterial({
        name: data.materialName,
        category: category,
        unitOfMeasure: unitOfMeasure,
        currentBalance: data.quantity,
        minimumStockLevel: minimumStockLevel,
        costPerUnit: data.costPerUnit || 0,
        supplier: data.supplier || 'N/A',
        source: 'PURCHASED',
        purchaseRequestId: data.purchaseRequestId
      });
      
      // Mark the purchase request as registered in inventory
      if (data.purchaseRequestId) {
        await db.run(`
          UPDATE purchase_requests 
          SET status = 'Registered',
              receivedDate = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [data.purchaseRequestId]);
      }
      
      return NextResponse.json({
        success: true,
        message: `${data.materialName} registered in inventory with ${data.quantity} ${unitOfMeasure}`,
        materialId: materialId,
        action: 'created',
        purchaseRequestId: data.purchaseRequestId
      });
    }
    
  } catch (error: any) {
    console.error('Error registering purchase in inventory:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to register purchase in inventory' 
    }, { status: 500 });
  }
}