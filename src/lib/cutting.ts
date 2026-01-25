import { getDb } from './db';

export type CuttingStatus = 'not_started' | 'in_progress' | 'completed' | 'qc_pending' | 'qc_passed' | 'qc_failed' | 'handed_over';

export type CuttingRecord = {
  id: number;
  orderId: string;
  orderNumber: string;
  productCode: string;
  productName: string;
  imageUrl?: string;
  cuttingStartDate?: string;
  cuttingCompletedDate?: string;
  cuttingBy?: string;
  qcCheckedBy?: string;
  qcCheckDate?: string;
  qcPassed: number;
  qcRemarks?: string;
  handedOverToProduction: number;
  handoverDate?: string;
  handoverBy?: string;
  productionReceivedBy?: string;
  status: CuttingStatus;
  created_at: string;
  updated_at: string;
  items?: CuttingItem[];
  // Sewing acceptance fields
  sewingNotified: number;
  sewingNotifiedDate?: string;
  sewingAccepted: number;
  sewingAcceptedDate?: string;
  sewingAcceptedBy?: string;
  actualHandoverToSewing?: string;
  sewingResponsiblePerson?: string;
  // KPI tracking fields
  plannedCuttingDate?: string;
  plannedSewingStartDate?: string;
  actualSewingStartDate?: string;
  cuttingDelayDays: number;
  sewingStartDelayDays: number;
  planningNotified: number;
  totalQuantity?: number;
  orderStatus?: string;
};

export type CuttingItem = {
  id: number;
  cuttingRecordId: number;
  orderId: string;
  size: string;
  color: string;
  quantity: number;
  cutQuantity: number;
  qcPassedQuantity: number;
  qcRejectedQuantity: number;
  componentsCut?: string; // JSON string of components
  remarks?: string;
  created_at: string;
  updated_at: string;
};

export type ProductComponent = {
  name: string;
  isCut: boolean;
};

// Server-side functions
export async function getCuttingRecordsFromDB(): Promise<CuttingRecord[]> {
  const db = await getDb();
  const records = await db.all(`
    SELECT cr.*, 
           mo.quantity as totalQuantity,
           mo.status as orderStatus
    FROM cutting_records cr
    LEFT JOIN marketing_orders mo ON cr.orderId = mo.id
    ORDER BY cr.created_at DESC
  `);

  // Fetch items for each record
  for (const record of records) {
    const items = await db.all(`
      SELECT * FROM cutting_items
      WHERE cuttingRecordId = ?
      ORDER BY size, color
    `, record.id);
    record.items = items;
  }

  return records;
}

export async function getCuttingRecordByIdFromDB(id: number): Promise<CuttingRecord | null> {
  const db = await getDb();
  const record = await db.get(`
    SELECT cr.*, 
           mo.quantity as totalQuantity,
           mo.status as orderStatus
    FROM cutting_records cr
    LEFT JOIN marketing_orders mo ON cr.orderId = mo.id
    WHERE cr.id = ?
  `, id);

  if (!record) return null;

  const items = await db.all(`
    SELECT * FROM cutting_items
    WHERE cuttingRecordId = ?
    ORDER BY size, color
  `, id);
  record.items = items;

  return record;
}

export async function getCuttingRecordByOrderIdFromDB(orderId: string): Promise<CuttingRecord | null> {
  const db = await getDb();
  const record = await db.get(`
    SELECT cr.*, 
           mo.quantity as totalQuantity,
           mo.status as orderStatus
    FROM cutting_records cr
    LEFT JOIN marketing_orders mo ON cr.orderId = mo.id
    WHERE cr.orderId = ?
  `, orderId);

  if (!record) return null;

  const items = await db.all(`
    SELECT * FROM cutting_items
    WHERE cuttingRecordId = ?
    ORDER BY size, color
  `, record.id);
  record.items = items;

  return record;
}

export async function createCuttingRecordFromDB(orderId: string, orderNumber: string, productCode: string, productName: string, imageUrl: string | undefined, items: any[], username: string): Promise<number> {
  const db = await getDb();
  
  const result = await db.run(`
    INSERT INTO cutting_records (
      orderId, orderNumber, productCode, productName, imageUrl, 
      cuttingStartDate, cuttingBy, status
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, 'in_progress')
  `, orderId, orderNumber, productCode, productName, imageUrl, username);

  const cuttingRecordId = result.lastID;

  // Insert cutting items
  for (const item of items) {
    await db.run(`
      INSERT INTO cutting_items (
        cuttingRecordId, orderId, size, color, quantity
      ) VALUES (?, ?, ?, ?, ?)
    `, cuttingRecordId, orderId, item.size, item.color, item.quantity);
  }

  // Update marketing order status
  await db.run(`
    UPDATE marketing_orders 
    SET cuttingStatus = 'in_progress',
        cuttingStartDate = datetime('now')
    WHERE id = ?
  `, orderId);

  return cuttingRecordId;
}

export async function updateCuttingItemFromDB(itemId: number, updates: Partial<CuttingItem>): Promise<boolean> {
  const db = await getDb();
  
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.cutQuantity !== undefined) {
    fields.push('cutQuantity = ?');
    values.push(updates.cutQuantity);
  }
  if (updates.qcPassedQuantity !== undefined) {
    fields.push('qcPassedQuantity = ?');
    values.push(updates.qcPassedQuantity);
  }
  if (updates.qcRejectedQuantity !== undefined) {
    fields.push('qcRejectedQuantity = ?');
    values.push(updates.qcRejectedQuantity);
  }
  if (updates.componentsCut !== undefined) {
    fields.push('componentsCut = ?');
    values.push(updates.componentsCut);
  }
  if (updates.remarks !== undefined) {
    fields.push('remarks = ?');
    values.push(updates.remarks);
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = datetime("now")');
  values.push(itemId);

  await db.run(`
    UPDATE cutting_items 
    SET ${fields.join(', ')}
    WHERE id = ?
  `, ...values);

  return true;
}

export async function completeCuttingFromDB(recordId: number, username: string): Promise<boolean> {
  const db = await getDb();
  
  await db.run(`
    UPDATE cutting_records 
    SET status = 'qc_pending',
        cuttingCompletedDate = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `, recordId);

  // Get order ID and details
  const record = await db.get(
    'SELECT orderId, orderNumber, productName FROM cutting_records WHERE id = ?', 
    recordId
  );
  
  if (record) {
    // Update marketing order status
    await db.run(`
      UPDATE marketing_orders 
      SET cuttingStatus = 'qc_pending',
          cuttingCompletedDate = datetime('now')
      WHERE id = ?
    `, record.orderId);

    // Create notification for quality department
    await db.run(`
      INSERT INTO notifications (id, userType, title, description, href, isRead, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      'quality_inspection',
      'Cutting QC Request',
      `Cutting for order ${record.orderNumber} (${record.productName}) is completed and needs QC inspection.`,
      `/cutting`,
      0
    ]);
  }

  return true;
}

export async function requestQCFromDB(recordId: number, username: string): Promise<boolean> {
  return completeCuttingFromDB(recordId, username);
}

export async function qcCheckCuttingFromDB(recordId: number, passed: boolean, remarks: string, username: string): Promise<boolean> {
  const db = await getDb();
  
  await db.run(`
    UPDATE cutting_records 
    SET status = ?,
        qcPassed = ?,
        qcRemarks = ?,
        qcCheckedBy = ?,
        qcCheckDate = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `, passed ? 'qc_passed' : 'qc_failed', passed ? 1 : 0, remarks, username, recordId);

  // Get orderId
  const record = await db.get('SELECT orderId FROM cutting_records WHERE id = ?', recordId);
  
  if (record) {
    await db.run(`
      UPDATE marketing_orders 
      SET cuttingQcPassed = ?
      WHERE id = ?
    `, passed ? 1 : 0, record.orderId);
  }

  return true;
}

export async function handoverToProductionFromDB(recordId: number, username: string, productionReceivedBy: string): Promise<boolean> {
  const db = await getDb();
  
  await db.run(`
    UPDATE cutting_records 
    SET status = 'handed_over',
        handedOverToProduction = 1,
        handoverDate = datetime('now'),
        handoverBy = ?,
        productionReceivedBy = ?,
        sewingNotified = 1,
        sewingNotifiedDate = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `, username, productionReceivedBy, recordId);

  // Get order ID and details
  const record = await db.get(
    'SELECT orderId, orderNumber, productName FROM cutting_records WHERE id = ?', 
    recordId
  );
  
  if (record) {
    // Update marketing order status
    await db.run(`
      UPDATE marketing_orders 
      SET cuttingHandedOver = 1,
          cuttingStatus = 'handed_over'
      WHERE id = ?
    `, record.orderId);

    // Create notification for sewing department
    await db.run(`
      INSERT INTO notifications (id, userType, title, description, href, isRead, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      'sewing',
      'Cut Order Ready for Handover',
      `Cut order ${record.orderNumber} (${record.productName}) is ready. Please review and accept the cut panels.`,
      `/cutting/${recordId}`,
      0
    ]);
    
    // Also notify planning about the handover
    await db.run(`
      INSERT INTO notifications (id, userType, title, description, href, isRead, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      'planning',
      'Cutting Handover Completed',
      `Cut order ${record.orderNumber} (${record.productName}) has been handed over to production and sewing notified.`,
      `/cutting/${recordId}`,
      0
    ]);
  }

  return true;
}

export async function notifySewingOfCuttingCompletion(recordId: number, username: string): Promise<boolean> {
  const db = await getDb();
  
  await db.run(`
    UPDATE cutting_records 
    SET sewingNotified = 1,
        sewingNotifiedDate = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `, recordId);

  // Get order ID and details
  const record = await db.get(
    'SELECT orderId, orderNumber, productName FROM cutting_records WHERE id = ?', 
    recordId
  );
  
  if (record) {
    // Create notification for sewing department
    await db.run(`
      INSERT INTO notifications (id, userType, title, description, href, isRead, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      'sewing',
      'Cut Order Ready for Handover',
      `Cut order ${record.orderNumber} (${record.productName}) is ready. Please review and accept the cut panels.`,
      `/cutting/${recordId}`,
      0
    ]);
    
    // Also notify planning about the handover
    await db.run(`
      INSERT INTO notifications (id, userType, title, description, href, isRead, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      'planning',
      'Sewing Notification Sent',
      `Cut order ${record.orderNumber} (${record.productName}) has been sent to sewing for acceptance.`,
      `/cutting/${recordId}`,
      0
    ]);
  }

  return true;
}

export async function acceptCutPanels(recordId: number, username: string, sewingResponsiblePerson?: string): Promise<boolean> {
  const db = await getDb();
  
  await db.run(`
    UPDATE cutting_records 
    SET sewingAccepted = 1,
        sewingAcceptedDate = datetime('now'),
        sewingAcceptedBy = ?,
        actualHandoverToSewing = datetime('now'),
        sewingResponsiblePerson = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `, username, sewingResponsiblePerson || username, recordId);

  // Get order ID and details
  const record = await db.get(
    'SELECT orderId, orderNumber, productName FROM cutting_records WHERE id = ?', 
    recordId
  );
  
  if (record) {
    // Update marketing order status
    await db.run(`
      UPDATE marketing_orders 
      SET sewingStatus = 'in_progress'
      WHERE id = ?
    `, record.orderId);
    
    // Create notification for planning that sewing has accepted
    await db.run(`
      INSERT INTO notifications (id, userType, title, description, href, isRead, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      'planning',
      'Sewing Accepted Cut Panels',
      `Sewing has accepted cut panels for order ${record.orderNumber} (${record.productName}).`,
      `/cutting/${recordId}`,
      0
    ]);
    
    // Calculate KPI metrics
    await calculateKPIMetrics(db, recordId);
  }

  return true;
}

// Calculate KPI metrics comparing planned vs actual dates
async function calculateKPIMetrics(db: any, recordId: number) {
  const record = await db.get(
    `SELECT plannedCuttingDate, cuttingCompletedDate, 
           plannedSewingStartDate, actualSewingStartDate,
           cuttingDelayDays, sewingStartDelayDays
     FROM cutting_records WHERE id = ?`, 
    recordId
  );
  
  if (record) {
    let cuttingDelay = 0;
    let sewingStartDelay = 0;
    
    // Calculate cutting delay if planned and actual dates exist
    if (record.plannedCuttingDate && record.cuttingCompletedDate) {
      const plannedDate = new Date(record.plannedCuttingDate);
      const actualDate = new Date(record.cuttingCompletedDate);
      const diffTime = Math.abs(actualDate.getTime() - plannedDate.getTime());
      cuttingDelay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If actual is later than planned, it's a positive delay
      if (actualDate > plannedDate) {
        cuttingDelay = cuttingDelay;
      } else {
        cuttingDelay = 0; // Early completion doesn't count as negative delay
      }
    }
    
    // Calculate sewing start delay if planned and actual dates exist
    if (record.plannedSewingStartDate && record.actualSewingStartDate) {
      const plannedDate = new Date(record.plannedSewingStartDate);
      const actualDate = new Date(record.actualSewingStartDate);
      const diffTime = Math.abs(actualDate.getTime() - plannedDate.getTime());
      sewingStartDelay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If actual is later than planned, it's a positive delay
      if (actualDate > plannedDate) {
        sewingStartDelay = sewingStartDelay;
      } else {
        sewingStartDelay = 0; // Early start doesn't count as negative delay
      }
    }
    
    // Update the cutting record with calculated delays
    await db.run(`
      UPDATE cutting_records 
      SET cuttingDelayDays = ?,
          sewingStartDelayDays = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, cuttingDelay, sewingStartDelay, recordId);
  }
}

// Client-side functions
export async function getCuttingRecords(): Promise<CuttingRecord[]> {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/cutting', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch cutting records');
  return response.json();
}

export async function getCuttingRecord(id: number): Promise<CuttingRecord> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch cutting record');
  return response.json();
}

export async function createCuttingRecord(orderId: string): Promise<number> {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/cutting', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ orderId })
  });
  if (!response.ok) throw new Error('Failed to create cutting record');
  const data = await response.json();
  return data.id;
}

export async function updateCuttingItem(itemId: number, updates: Partial<CuttingItem>): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  return response.ok;
}

export async function completeCutting(recordId: number): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/${recordId}/complete`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.ok;
}

export async function qcCheckCutting(recordId: number, passed: boolean, remarks: string): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/${recordId}/qc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ passed, remarks })
  });
  return response.ok;
}

export async function handoverToProduction(recordId: number, productionReceivedBy: string): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/${recordId}/handover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ productionReceivedBy })
  });
  return response.ok;
}

export async function notifySewing(recordId: number): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/${recordId}/notify-sewing`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.ok;
}

export async function requestQC(recordId: number): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/${recordId}/request-qc`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.ok;
}

export async function acceptCut(recordId: number, sewingResponsiblePerson?: string): Promise<boolean> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`/api/cutting/${recordId}/accept-cut`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ sewingResponsiblePerson })
  });
  return response.ok;
}
