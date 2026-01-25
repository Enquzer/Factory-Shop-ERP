
import { getDb, resetDbCache } from './db';
import { RawMaterial } from './raw-materials';

export type ProductBOMItem = {
  id: number;
  productId: string;
  materialId: string;
  quantityPerUnit: number;
  wastagePercentage: number;
  materialName?: string;
  unitOfMeasure?: string;
  currentBalance?: number;
};

export type MaterialRequisition = {
  id: string;
  orderId: string;
  materialId: string;
  quantityRequested: number;
  quantityIssued: number;
  status: 'Pending' | 'Part-Issued' | 'Completed';
  requestedDate: Date;
  issuedDate?: Date;
  materialName?: string;
};

// --- BOM Management ---

export async function getProductBOM(productId: string): Promise<ProductBOMItem[]> {
  try {
    const db = await getDb();
    const items = await db.all(`
      SELECT b.*, rm.name as materialName, rm.unitOfMeasure, rm.currentBalance
      FROM product_bom b
      JOIN raw_materials rm ON b.materialId = rm.id
      WHERE b.productId = ?
    `, [productId]);
    
    return items;
  } catch (error) {
    console.error('Error fetching product BOM:', error);
    return [];
  }
}

export async function addBOMItem(item: Omit<ProductBOMItem, 'id' | 'materialName' | 'unitOfMeasure' | 'currentBalance'>): Promise<number> {
  try {
    const db = await getDb();
    // Check if item already links logic if needed, but distinct materials allowed? No, usually one entry per material per product.
    const result = await db.run(`
      INSERT INTO product_bom (productId, materialId, quantityPerUnit, wastagePercentage)
      VALUES (?, ?, ?, ?)
    `, [item.productId, item.materialId, item.quantityPerUnit, item.wastagePercentage]);
    
    resetDbCache();
    return result.lastID;
  } catch (error) {
    console.error('Error adding BOM item:', error);
    throw error;
  }
}

export async function removeBOMItem(id: number): Promise<void> {
  try {
    const db = await getDb();
    await db.run('DELETE FROM product_bom WHERE id = ?', [id]);
    resetDbCache();
  } catch (error) {
    console.error('Error removing BOM item:', error);
    throw error;
  }
}

// --- Material Requisition Logic ---

// Triggered when an Order is Confirmed/Planned
// "Planning User must be able to generate a 'Store Issue Request' based on BOM"
export async function generateMaterialRequisitionsForOrder(orderId: string, orderQuantity: number, productId: string): Promise<void> {
  try {
    const db = await getDb();
    const bomItems = await getProductBOM(productId);
    
    // Check if order already has requisitions to avoid duplicates?
    const existing = await db.get('SELECT 1 FROM material_requisitions WHERE orderId = ?', [orderId]);
    if (existing) {
        console.log('Requisitions already exist for order:', orderId);
        return; 
    }

    if (bomItems.length === 0) {
        console.log('No BOM items found for product:', productId);
        return;
    }

    for (const item of bomItems) {
      const totalReq = item.quantityPerUnit * orderQuantity * (1 + (item.wastagePercentage / 100));
      const reqId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // unique ID
      
      await db.run(`
        INSERT INTO material_requisitions (id, orderId, materialId, quantityRequested, status)
        VALUES (?, ?, ?, ?, 'Pending')
      `, [reqId, orderId, item.materialId, totalReq]); // Ensure precision handling if needed?
    }
    
    resetDbCache();
  } catch (error) {
    console.error('Error generating material requisitions:', error);
    throw error;
  }
}

export async function getMaterialRequisitionsForOrder(orderId: string): Promise<MaterialRequisition[]> {
  try {
    const db = await getDb();
    const reqs = await db.all(`
      SELECT r.*, rm.name as materialName
      FROM material_requisitions r
      JOIN raw_materials rm ON r.materialId = rm.id
      WHERE r.orderId = ?
    `, [orderId]);
    
    return reqs.map((r: any) => ({
      ...r,
      requestedDate: new Date(r.requestedDate),
      issuedDate: r.issuedDate ? new Date(r.issuedDate) : undefined
    }));
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    return [];
  }
}

// Store User "Issue" Action
export async function issueMaterial(requisitionId: string, quantityToIssue: number): Promise<void> {
  try {
    const db = await getDb();
    
    // Get current requisition status/details
    const req = await db.get('SELECT * FROM material_requisitions WHERE id = ?', [requisitionId]);
    if (!req) throw new Error('Requisition not found');
    
    // Deduct from Stock
    await db.run(`
      UPDATE raw_materials 
      SET currentBalance = currentBalance - ? 
      WHERE id = ?
    `, [quantityToIssue, req.materialId]);
    
    // Update Requisition Record
    const newIssued = (req.quantityIssued || 0) + quantityToIssue;
    let status = 'Part-Issued';
    if (newIssued >= req.quantityRequested - 0.01) { // Tolerance for float comparison
        status = 'Completed';
    }
    
    await db.run(`
      UPDATE material_requisitions
      SET quantityIssued = ?, status = ?, issuedDate = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newIssued, status, requisitionId]);
    
    resetDbCache();
  } catch (error) {
    console.error('Error issuing material:', error);
    throw error;
  }
}
