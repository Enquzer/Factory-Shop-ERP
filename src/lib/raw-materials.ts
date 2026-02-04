
import { getDB, resetDbCache } from './db';
import { getNextSequenceForSubcategory, generateRawMaterialId } from './raw-material-subcategories';

export type RawMaterial = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  unitOfMeasure: string;
  currentBalance: number;
  minimumStockLevel: number;
  costPerUnit: number;
  supplier?: string;
  source?: 'PURCHASED' | 'MANUAL' | 'OTHER'; // Origin of the inventory
  purchaseRequestId?: string; // Link to purchase request if applicable
  imageUrl?: string; // Raw material image URL
  createdAt?: Date;
  updatedAt?: Date;
};

export type PurchaseRequest = {
  id: string;
  materialId: string;
  quantity: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Rejected';
  requesterId?: string;
  requestedDate: Date;
  approvedDate?: Date;
  orderedDate?: Date;
  receivedDate?: Date;
  materialName?: string; // For joining in queries
  costPerUnit?: number;
  supplier?: string;
  notes?: string;
  rejectionReason?: string;
  orderId?: string;
  requisitionId?: string;
};

// --- Raw Material Registry Functions ---

export async function getRawMaterials(): Promise<RawMaterial[]> {
  try {
    const db = await getDB();
    const materials = await db.all('SELECT *, COALESCE(source, "MANUAL") as source FROM raw_materials ORDER BY name ASC');
    return materials.map((m: any) => ({
      ...m,
      createdAt: new Date(m.created_at),
      updatedAt: new Date(m.updated_at)
    }));
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    return [];
  }
}

export async function getRawMaterialById(id: string): Promise<RawMaterial | null> {
  try {
    const db = await getDB();
    const material = await db.get('SELECT * FROM raw_materials WHERE id = ?', [id]);
    if (!material) return null;
    return {
      ...material,
      createdAt: new Date(material.created_at),
      updatedAt: new Date(material.updated_at)
    };
  } catch (error) {
    console.error('Error fetching raw material:', error);
    return null;
  }
}

export async function createRawMaterial(material: Omit<RawMaterial, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const db = await getDB();
    
    let id: string;
    if (material.subcategory) {
      // Generate ID with subcategory prefix: RW-Cat-Sub-XX
      const sequence = await getNextSequenceForSubcategory(material.category, material.subcategory);
      id = await generateRawMaterialId(material.category, material.subcategory, sequence);
    } else {
      // Fallback to timestamp-based ID
      id = `RM-${Date.now()}`;
    }
    
    await db.run(`
      INSERT INTO raw_materials (id, name, category, subcategory, unitOfMeasure, currentBalance, minimumStockLevel, costPerUnit, supplier, source, purchaseRequestId, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, 
      material.name, 
      material.category, 
      material.subcategory || null,
      material.unitOfMeasure, 
      material.currentBalance, 
      material.minimumStockLevel, 
      material.costPerUnit, 
      material.supplier, 
      material.source || 'MANUAL', 
      material.purchaseRequestId, 
      material.imageUrl
    ]);
    
    resetDbCache();
    return id;
  } catch (error) {
    console.error('Error creating raw material:', error);
    throw error;
  }
}

export async function updateRawMaterial(id: string, updates: Partial<RawMaterial>): Promise<void> {
  try {
    const db = await getDB();
    const fields: string[] = [];
    const values: any[] = [];

    // Helper to add update fields
    const addField = (key: string, val: any) => {
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    };

    addField('name', updates.name);
    addField('category', updates.category);
    addField('subcategory', updates.subcategory);
    addField('unitOfMeasure', updates.unitOfMeasure);
    addField('currentBalance', updates.currentBalance);
    addField('minimumStockLevel', updates.minimumStockLevel);
    addField('costPerUnit', updates.costPerUnit);
    addField('supplier', updates.supplier);
    addField('source', updates.source);
    addField('purchaseRequestId', updates.purchaseRequestId);
    addField('imageUrl', updates.imageUrl);

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(`UPDATE raw_materials SET ${fields.join(', ')} WHERE id = ?`, values);
    resetDbCache();
  } catch (error) {
    console.error('Error updating raw material:', error);
    throw error;
  }
}

export async function deleteRawMaterial(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.run('DELETE FROM raw_materials WHERE id = ?', [id]);
    resetDbCache();
  } catch (error) {
    console.error('Error deleting raw material:', error);
    throw error;
  }
}

// --- Purchase Request Workflow ---

export async function createPurchaseRequest(request: Omit<PurchaseRequest, 'id' | 'status' | 'requestedDate'>): Promise<string> {
  try {
    const db = await getDB();
    const id = `PR-${Date.now()}`;
    await db.run(`
      INSERT INTO purchase_requests (id, materialId, quantity, reason, status, requesterId, costPerUnit, supplier, notes, orderId, requisitionId)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)
    `, [id, request.materialId, request.quantity, request.reason, request.requesterId, request.costPerUnit, request.supplier, request.notes, request.orderId, request.requisitionId]);
    resetDbCache();
    return id;
  } catch (error) {
    console.error('Error creating purchase request:', error);
    throw error;
  }
}

export async function updatePurchaseRequestStatus(id: string, status: PurchaseRequest['status']): Promise<void> {
  try {
    const db = await getDB();
    let dateField = '';
    
    // Set appropriate date field based on status
    if (status === 'Approved') dateField = ', approvedDate = CURRENT_TIMESTAMP';
    else if (status === 'Ordered') dateField = ', orderedDate = CURRENT_TIMESTAMP';
    else if (status === 'Received') dateField = ', receivedDate = CURRENT_TIMESTAMP';

    await db.run(`UPDATE purchase_requests SET status = ?${dateField} WHERE id = ?`, [status, id]);
    
    // If received, automatically update stock?
    // "The Store User’s "Issue" action must deduct..." - Requisition logic handles deducting.
    // However, Receiving a Purchase Request should INCREASE stock.
    if (status === 'Received') {
      const pr = await db.get('SELECT materialId, quantity FROM purchase_requests WHERE id = ?', [id]);
      if (pr) {
        // Update the material record to mark it as PURCHASED source
        await db.run(`
          UPDATE raw_materials 
          SET currentBalance = currentBalance + ?, 
              source = 'PURCHASED',
              purchaseRequestId = ?
          WHERE id = ?
        `, [pr.quantity, id, pr.materialId]);
      }
    }
    
    resetDbCache();
  } catch (error) {
    console.error('Error updating purchase request status:', error);
    throw error;
  }
}

export async function getPurchaseRequests(): Promise<PurchaseRequest[]> {
  try {
    const db = await getDB();
    const requests = await db.all(`
      SELECT pr.*, rm.name as materialName 
      FROM purchase_requests pr
      JOIN raw_materials rm ON pr.materialId = rm.id
      ORDER BY pr.requestedDate DESC
    `);
    
    return requests.map((r: any) => ({
      ...r,
      requestedDate: new Date(r.requestedDate),
      approvedDate: r.approvedDate ? new Date(r.approvedDate) : undefined,
      orderedDate: r.orderedDate ? new Date(r.orderedDate) : undefined,
      receivedDate: r.receivedDate ? new Date(r.receivedDate) : undefined
    }));
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    return [];
  }
}
