import { getDb } from './db';

// Integration functions between IE module and existing Planning OB system

/**
 * Get Operation Bulletin from existing system (Planning module)
 * This function pulls OB data that was created by Planning module
 */
export async function getPlanningOB(orderId: string) {
  try {
    const db = await getDb();
    const items = await db.all(
      `SELECT ob.*, ea.employeeId as operatorId, e.name as operatorName
       FROM operation_bulletins ob
       LEFT JOIN employee_assignments ea ON ob.orderId = ea.orderId 
         AND CAST(ob.sequence AS TEXT) = ea.opCode 
         AND (ob.componentName = ea.componentName OR (ob.componentName IS NULL AND ea.componentName IS NULL))
       LEFT JOIN employees e ON ea.employeeId = e.employeeId
       WHERE ob.orderId = ?
       ORDER BY ob.sequence ASC`,
      [orderId]
    );
    return items;
  } catch (error) {
    console.error('Error fetching planning OB:', error);
    return [];
  }
}

/**
 * Check if IE has created OB for this order
 * Returns true if IE OB exists, false if only Planning OB exists
 */
export async function hasIEOB(orderId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.get(
      'SELECT COUNT(*) as count FROM tbl_IE_OB_Master WHERE orderId = ?',
      [orderId]
    );
    return (result?.count || 0) > 0;
  } catch (error) {
    console.error('Error checking IE OB existence:', error);
    return false;
  }
}

/**
 * Get combined OB view - prioritizes IE OB if exists, falls back to Planning OB
 */
export async function getCombinedOB(orderId: string) {
  try {
    const hasIE = await hasIEOB(orderId);
    
    if (hasIE) {
      // Return IE OB data
      const db = await getDb();
      const items = await db.all(
        `SELECT ob.*, op.operationName, op.standardSMV, op.machineType as defaultMachineType
         FROM tbl_IE_OB_Master ob
         LEFT JOIN tbl_IE_Op_Library op ON ob.opCode = op.opCode
         WHERE ob.orderId = ?
         ORDER BY ob.sequence`,
        [orderId]
      );
      
      return {
        source: 'IE',
        items: items.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }))
      };
    } else {
      // Return Planning OB data
      const planningOB = await getPlanningOB(orderId);
      return {
        source: 'Planning',
        items: planningOB
      };
    }
  } catch (error) {
    console.error('Error fetching combined OB:', error);
    return { source: 'Error', items: [] };
  }
}

/**
 * Convert Planning OB to IE OB format for editing
 */
export async function convertPlanningToIEOB(orderId: string, productCode: string, createdBy: string) {
  try {
    const planningOB = await getPlanningOB(orderId);
    
    if (planningOB.length === 0) {
      return { success: false, message: 'No Planning OB found to convert' };
    }
    
    const db = await getDb();
    
    // First, check if IE OB already exists
    const existingIEOB = await db.get(
      'SELECT id FROM tbl_IE_OB_Master WHERE orderId = ? LIMIT 1',
      [orderId]
    );
    
    if (existingIEOB) {
      return { success: false, message: 'IE OB already exists for this order' };
    }
    
    // Convert and insert Planning OB to IE OB table
    for (const item of planningOB) {
      await db.run(
        `INSERT INTO tbl_IE_OB_Master 
         (orderId, productCode, sequence, opCode, componentName, machineType, smv, manpower, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          productCode,
          item.sequence,
          item.operationName, // Using operationName as opCode for now
          item.componentName,
          item.machineType,
          item.smv || 0,
          item.manpower || 1,
          createdBy
        ]
      );
    }
    
    return { success: true, message: 'Planning OB converted to IE OB successfully' };
  } catch (error) {
    console.error('Error converting Planning OB to IE OB:', error);
    return { success: false, message: 'Failed to convert OB: ' + (error as Error).message };
  }
}

/**
 * Sync IE OB changes back to Planning OB table
 * This allows Planning module to see IE updates
 */
export async function syncIEOBToPlanning(orderId: string) {
  try {
    const db = await getDb();
    
    // Get IE OB data
    const ieOB = await db.all(
      'SELECT * FROM tbl_IE_OB_Master WHERE orderId = ? ORDER BY sequence',
      [orderId]
    );
    
    if (ieOB.length === 0) {
      return { success: false, message: 'No IE OB found to sync' };
    }
    
    // Delete existing Planning OB for this order
    await db.run('DELETE FROM operation_bulletins WHERE orderId = ?', [orderId]);
    
    // Insert IE OB data into Planning OB table
    for (const item of ieOB) {
      await db.run(
        `INSERT INTO operation_bulletins 
         (orderId, productCode, sequence, operationName, componentName, machineType, smv, manpower)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productCode,
          item.sequence,
          item.opCode, // Using opCode as operationName
          item.componentName,
          item.machineType,
          item.smv || 0,
          item.manpower || 1
        ]
      );
    }
    
    return { success: true, message: 'IE OB synced to Planning successfully' };
  } catch (error) {
    console.error('Error syncing IE OB to Planning:', error);
    return { success: false, message: 'Failed to sync OB: ' + (error as Error).message };
  }
}

/**
 * Update/Save IE OB items
 */
export async function updateIEOB(orderId: string, items: any[], updatedBy: string) {
  try {
    const db = await getDb();
    
    // Get product code from first existing item or search in marketing_orders
    let productCode = items[0]?.productCode;
    if (!productCode) {
      const order = await db.get('SELECT productCode FROM marketing_orders WHERE id = ?', [orderId]);
      productCode = order?.productCode;
    }

    await db.run('BEGIN TRANSACTION');
    
    try {
      // Delete existing IE OB items
      await db.run('DELETE FROM tbl_IE_OB_Master WHERE orderId = ?', [orderId]);
      
      // Insert new items
      for (const item of items) {
        await db.run(
          `INSERT INTO tbl_IE_OB_Master 
           (orderId, productCode, sequence, opCode, componentName, machineType, smv, manpower, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            productCode,
            item.sequence,
            item.opCode || item.operationName,
            item.componentName || null,
            item.machineType,
            item.smv || 0,
            item.manpower || 1,
            updatedBy
          ]
        );
      }
      
      await db.run('COMMIT');
      return { success: true, message: 'IE OB updated successfully' };
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error updating IE OB:', error);
    return { success: false, message: 'Failed to update OB: ' + (error as Error).message };
  }
}

/**
 * Get all orders that have OB (from either IE or Planning)
 */
export async function getOrdersWithOB() {
  try {
    const db = await getDb();
    
    // Get orders with IE OB
    const ieOrders = await db.all(`
      SELECT DISTINCT mo.id, mo.orderNumber, mo.productCode, mo.productName, 
             'IE' as source, iob.updatedAt as lastModified
      FROM marketing_orders mo
      JOIN tbl_IE_OB_Master iob ON mo.id = iob.orderId
    `);
    
    // Get orders with Planning OB but no IE OB
    const planningOrders = await db.all(`
      SELECT DISTINCT mo.id, mo.orderNumber, mo.productCode, mo.productName,
             'Planning' as source, ob.updated_at as lastModified
      FROM marketing_orders mo
      JOIN operation_bulletins ob ON mo.id = ob.orderId
      WHERE mo.id NOT IN (SELECT DISTINCT orderId FROM tbl_IE_OB_Master)
    `);
    
    return [...ieOrders, ...planningOrders].sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  } catch (error) {
    console.error('Error fetching orders with OB:', error);
    return [];
  }
}

/**
 * Create new IE OB based on product/operation library
 */
export async function createIEOBFromLibrary(
  orderId: string, 
  productCode: string, 
  selectedOperations: Array<{opCode: string, sequence: number, componentName?: string}>,
  createdBy: string
) {
  try {
    const db = await getDb();
    
    // First, check if OB already exists
    const existingOB = await db.get(
      'SELECT id FROM tbl_IE_OB_Master WHERE orderId = ? LIMIT 1',
      [orderId]
    );
    
    if (existingOB) {
      return { success: false, message: 'OB already exists for this order' };
    }
    
    // Get operation details from library
    for (const op of selectedOperations) {
      const opDetail = await db.get(
        'SELECT * FROM tbl_IE_Op_Library WHERE opCode = ?',
        [op.opCode]
      );
      
      if (opDetail) {
        await db.run(
          `INSERT INTO tbl_IE_OB_Master 
           (orderId, productCode, sequence, opCode, componentName, machineType, smv, manpower, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            productCode,
            op.sequence,
            op.opCode,
            op.componentName || null,
            opDetail.machineType,
            opDetail.standardSMV,
            1, // Default manpower
            createdBy
          ]
        );
      }
    }
    
    return { success: true, message: 'IE OB created from library successfully' };
  } catch (error) {
    console.error('Error creating IE OB from library:', error);
    return { success: false, message: 'Failed to create OB: ' + (error as Error).message };
  }
}