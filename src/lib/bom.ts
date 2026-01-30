
import { getDb, resetDbCache } from './db';
import { RawMaterial } from './raw-materials';
import { getMarketingOrderByIdFromDB } from './marketing-orders';
import { padNumberGenerator } from './pad-number-generator';

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
  purchaseStatus?: string;
  purchaseId?: string;
  purchaseQuantity?: number;
  // Pad number fields
  padNumber?: string;
  padSequence?: number;
  padPrefix?: string;
  padFormat?: string;
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
    
    // Check if order already has requisitions to avoid duplicates? (Skip check for re-generation)
    /*
    const existing = await db.get('SELECT 1 FROM material_requisitions WHERE orderId = ?', [orderId]);
    if (existing) {
        console.log('Requisitions already exist for order:', orderId);
        return; 
    }
    */

    if (bomItems.length === 0) {
        console.log('No BOM items found for product:', productId);
        return;
    }

    // Get the marketing order to access size/color breakdown
    const order = await getMarketingOrderByIdFromDB(orderId);
    
    if (order && order.items && order.items.length > 0) {
      // Use size/color breakdown to calculate requisitions
      for (const item of bomItems) {
        let totalReq = 0;
        
        // Calculate total requirement based on each size/color combination
        for (const orderItem of order.items) {
          const itemRequirement = item.quantityPerUnit * orderItem.quantity * (1 + (item.wastagePercentage / 100));
          totalReq += itemRequirement;
        }
        
        const reqId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // unique ID
        
        await db.run(`
          INSERT INTO material_requisitions (id, orderId, materialId, quantityRequested, status)
          VALUES (?, ?, ?, ?, 'Pending')
        `, [reqId, orderId, item.materialId, totalReq]);
      }
    } else {
      // Fallback to total quantity if no size/color breakdown exists
      for (const item of bomItems) {
        const totalReq = item.quantityPerUnit * orderQuantity * (1 + (item.wastagePercentage / 100));
        const reqId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`; // unique ID
        
        await db.run(`
          INSERT INTO material_requisitions (id, orderId, materialId, quantityRequested, status)
          VALUES (?, ?, ?, ?, 'Pending')
        `, [reqId, orderId, item.materialId, totalReq]);
      }
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
      SELECT r.*, rm.name as materialName, pr.status as purchaseStatus, pr.id as purchaseId, pr.quantity as purchaseQuantity
      FROM material_requisitions r
      JOIN raw_materials rm ON r.materialId = rm.id
      LEFT JOIN purchase_requests pr ON r.id = pr.requisitionId
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
    
    // Generate pad number if this is the first issue
    let padNumber = req.padNumber;
    let padSequence = req.padSequence;
    
    if (!padNumber) {
      const padResult = await padNumberGenerator.generateNext('material');
      padNumber = padResult.number;
      padSequence = padResult.sequence;
    }
    
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
      SET quantityIssued = ?, status = ?, issuedDate = CURRENT_TIMESTAMP, 
          padNumber = ?, padSequence = ?, padPrefix = 'RM', padFormat = 'PREFIX-SEQUENCE'
      WHERE id = ?
    `, [newIssued, status, padNumber, padSequence, requisitionId]);
    
    resetDbCache();
  } catch (error) {
    console.error('Error issuing material:', error);
    throw error;
  }
}

// --- Consumption Analysis ---

export type ProductConsumption = {
  productId: string;
  productName: string;
  productCode: string;
  materials: {
    materialId: string;
    materialName: string;
    quantityPerUnit: number;
    unitOfMeasure: string;
  }[];
};

export async function getConsumptionDatabase(): Promise<ProductConsumption[]> {
  try {
    const db = await getDb();
    const products = await db.all(`
      SELECT p.id as productId, p.productName, p.productCode
      FROM products p
    `);
    
    const results: ProductConsumption[] = [];
    
    for (const p of products) {
      const materials = await db.all(`
        SELECT b.materialId, rm.name as materialName, b.quantityPerUnit, rm.unitOfMeasure
        FROM product_bom b
        JOIN raw_materials rm ON b.materialId = rm.id
        WHERE b.productId = ?
      `, [p.productId]);
      
      results.push({
        ...p,
        materials
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching consumption database:', error);
    return [];
  }
}

export type VariantConsumption = {
  orderId: string;
  orderNumber: string;
  productName: string;
  productCode: string;
  variantId: string;
  size: string;
  color: string;
  quantity: number;
  materials: {
    materialName: string;
    consumption: number;
    unitOfMeasure: string;
  }[];
};

export async function getOrderConsumptionHistory(): Promise<VariantConsumption[]> {
  try {
    const db = await getDb();
    
    // Get all orders and their items
    const orders = await db.all(`
      SELECT o.id as orderId, o.orderNumber, o.productName, o.productCode,
             oi.id as variantId, oi.size, oi.color, oi.quantity
      FROM marketing_orders o
      JOIN marketing_order_items oi ON o.id = oi.orderId
      ORDER BY o.createdAt DESC
    `);
    
    const results: VariantConsumption[] = [];
    
    for (const o of orders) {
      // Get the BOM for this product to calculate historical consumption
      const bom = await db.all(`
        SELECT rm.name, b.quantityPerUnit, rm.unitOfMeasure, b.wastagePercentage
        FROM product_bom b
        JOIN raw_materials rm ON b.materialId = rm.id
        JOIN products p ON b.productId = p.id
        WHERE p.productCode = ?
      `, [o.productCode]);
      
      const materials = bom.map((b: any) => ({
        materialName: b.name,
        consumption: b.quantityPerUnit * o.quantity * (1 + (b.wastagePercentage / 100)),
        unitOfMeasure: b.unitOfMeasure
      }));
      
      results.push({
        ...o,
        materials
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching order consumption history:', error);
    return [];
  }
}
