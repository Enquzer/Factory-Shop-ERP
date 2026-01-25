
import { getDb, resetDbCache } from './db';

export type ProductionEntry = {
  id: number;
  orderId: string;
  componentName: string;
  processType: 'Cutting' | 'Sewing' | 'Finishing' | 'Packing' | 'Store In';
  quantity: number;
  userId?: string;
  notes?: string;
  timestamp: string;
};

export async function logProductionActivity(entry: Omit<ProductionEntry, 'id' | 'timestamp'>): Promise<number> {
  try {
    const db = await getDb();
    
    // --- Validation Logic for Packing (Consolidation) ---
    // Enforce: Max_Packable_Qty = min(All_Components_Finished / Ratio)
    if (entry.processType === 'Packing') {
        // 1. Get Style Components and their Ratios
        const styleData = await db.get(`
            SELECT s.components 
            FROM marketing_orders o
            JOIN styles s ON s.number = o.productCode
            WHERE o.id = ?
        `, entry.orderId);
        
        if (styleData && styleData.components) {
            const components = JSON.parse(styleData.components); // [{name: 'Jacket', ratio: 1}, ...]
            
            let minSetsAvailable = Infinity;
            let limitingComponent = '';
            
            // 2. Check Finished Quantity for each Component
            for (const comp of components) {
                const finishedResult = await db.get(`
                    SELECT SUM(quantity) as total 
                    FROM production_ledger 
                    WHERE orderId = ? AND componentName = ? AND processType = 'Finishing'
                `, entry.orderId, comp.name);
                
                const finishedQty = finishedResult?.total || 0;
                const setsFromComp = Math.floor(finishedQty / (comp.ratio || 1));
                
                if (setsFromComp < minSetsAvailable) {
                    minSetsAvailable = setsFromComp;
                    limitingComponent = comp.name;
                }
            }
            
            // 3. Check Already Packed Quantity
            const packedResult = await db.get(`
                SELECT SUM(quantity) as total 
                FROM production_ledger 
                WHERE orderId = ? AND processType = 'Packing'
            `, entry.orderId);
            const alreadyPacked = packedResult?.total || 0;
            
            const availableToPack = minSetsAvailable - alreadyPacked;
            
            if (entry.quantity > availableToPack) {
                throw new Error(`Cannot pack ${entry.quantity} sets. Only ${availableToPack} sets are ready. Limiting component: ${limitingComponent} (${minSetsAvailable} sets finished).`);
            }
        }
        
        // --- Trigger Store Handover ---
        // Create a pending receipt for the Store
        await db.run(`
            INSERT INTO store_handovers (orderId, quantity, status)
            VALUES (?, ?, 'Pending')
        `, entry.orderId, entry.quantity);
    }

    // Log daily work into the append-only ledger
    const result = await db.run(`
      INSERT INTO production_ledger (orderId, componentName, processType, quantity, userId, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, entry.orderId, entry.componentName, entry.processType, entry.quantity, entry.userId, entry.notes);
    
    resetDbCache();
    return result.lastID;
  } catch (error) {
    console.error('Error logging production activity:', error);
    throw error;
  }
}

export async function getProductionHistory(orderId: string): Promise<ProductionEntry[]> {
  try {
    const db = await getDb();
    const history = await db.all(`
      SELECT * FROM production_ledger 
      WHERE orderId = ? 
      ORDER BY timestamp DESC
    `, orderId);
    
    return history.map((h: any) => ({
      id: h.id,
      orderId: h.orderId,
      componentName: h.componentName,
      processType: h.processType,
      quantity: h.quantity,
      userId: h.userId,
      notes: h.notes,
      timestamp: h.timestamp
    }));
  } catch (error) {
    console.error('Error fetching production history:', error);
    return [];
  }
}

// Module C: Check & Balance
// "Create a table comparing Cuts vs Sewing vs QC vs Packed vs Store In."
// Now supports Component-level breakdown
export async function getOrderBalance(orderId: string) {
    try {
        const db = await getDb();
        
        // Sum up quantities from ledger for each component and process type
        const summary = await db.all(`
            SELECT componentName, processType, SUM(quantity) as totalQty
            FROM production_ledger
            WHERE orderId = ?
            GROUP BY componentName, processType
        `, orderId);
        
        // Structure: { "Jacket": { Cutting: 100, Sewing: 50 }, "Pant": { ... } }
        const balance: Record<string, Record<string, number>> = {};
        
        summary.forEach((row: any) => {
            if (!balance[row.componentName]) {
                balance[row.componentName] = {
                    Cutting: 0,
                    Sewing: 0,
                    Finishing: 0,
                    Packing: 0,
                    'Store In': 0
                };
            }
            // @ts-ignore
            balance[row.componentName][row.processType] = row.totalQty;
        });
        
        return balance;
    } catch (error) {
        console.error('Error getting order balance:', error);
        return null;
    }
}

// Module 4: Consumption & Balance Logic
// Material Efficiency % = (Total Material Issued / BOM Planned Qty) * 100
export async function calculateMaterialEfficiency(orderId: string): Promise<any[]> {
    try {
        const db = await getDb();
        
        // Get all requisitions for this order
        const requisitions = await db.all(`
            SELECT r.materialId, rm.name, r.quantityRequested, r.quantityIssued
            FROM material_requisitions r
            JOIN raw_materials rm ON r.materialId = rm.id
            WHERE r.orderId = ?
        `, orderId);
        
        return requisitions.map((req: any) => {
            const planned = req.quantityRequested || 0;
            const issued = req.quantityIssued || 0;
            const efficiency = planned > 0 ? (issued / planned) * 100 : 0;
            
            return {
                materialName: req.name,
                plannedQty: planned,
                issuedQty: issued,
                efficiencyPercent: efficiency.toFixed(2)
            };
        });
    } catch (error) {
        console.error('Error calculating material efficiency:', error);
        return [];
    }
}
