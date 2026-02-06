import { getDb, resetDbCache } from './db';

// IE Operation Library Types
export type IEOperation = {
  id: number;
  opCode: string;
  operationName: string;
  category: string; // Cutting, Sewing, Finishing, Packing, Quality, etc.
  description: string;
  standardSMV: number; // Standard Minute Value
  machineType: string;
  skillLevelRequired: 'Beginner' | 'Intermediate' | 'Advanced';
  complexity: number; // 1-5 scale
  department: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IEOBMaster = {
  id: number;
  orderId: string;
  productCode: string;
  sequence: number;
  opCode: string;
  componentName: string;
  machineType: string;
  smv: number;
  manpower: number;
  workstationId: string;
  priority: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type IELineBalance = {
  id: number;
  lineId: string;
  workstationId: string;
  orderId: string;
  sequence: number;
  employeeId: string;
  operationId: number;
  targetOutput: number; // pcs/hour
  taktTime: number; // seconds
  cycleTime: number; // seconds
  efficiency: number;
  status: 'Assigned' | 'InProgress' | 'Completed';
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

// IE Operation Library Functions
export async function getIEOperations(category?: string, isActive: boolean = true): Promise<IEOperation[]> {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM tbl_IE_Op_Library WHERE isActive = ?';
    const params: any[] = [isActive ? 1 : 0];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, operationName';
    
    const operations = await db.all(query, ...params);
    return operations.map((op: any) => ({
      ...op,
      createdAt: new Date(op.createdAt),
      updatedAt: new Date(op.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching IE operations:', error);
    return [];
  }
}

export async function getIEOperationByCode(opCode: string): Promise<IEOperation | null> {
  try {
    const db = await getDb();
    const operation = await db.get('SELECT * FROM tbl_IE_Op_Library WHERE opCode = ?', [opCode]);
    if (!operation) return null;
    
    return {
      ...operation,
      createdAt: new Date(operation.createdAt),
      updatedAt: new Date(operation.updatedAt)
    };
  } catch (error) {
    console.error('Error fetching IE operation by code:', error);
    return null;
  }
}

export async function createIEOperation(operation: Omit<IEOperation, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_Op_Library 
       (opCode, operationName, category, description, standardSMV, machineType, 
        skillLevelRequired, complexity, department, isActive, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        operation.opCode,
        operation.operationName,
        operation.category,
        operation.description,
        operation.standardSMV,
        operation.machineType,
        operation.skillLevelRequired,
        operation.complexity,
        operation.department,
        operation.isActive ? 1 : 0,
        operation.createdBy
      ]
    );
    
    resetDbCache();
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating IE operation:', error);
    throw error;
  }
}

export async function updateIEOperation(id: number, updates: Partial<IEOperation>): Promise<boolean> {
  try {
    const db = await getDb();
    
    const allowedFields = [
      'operationName', 'category', 'description', 'standardSMV', 
      'machineType', 'skillLevelRequired', 'complexity', 'department', 'isActive'
    ];
    
    const fieldsToUpdate = Object.keys(updates).filter(key => 
      allowedFields.includes(key) && updates[key as keyof IEOperation] !== undefined
    );
    
    if (fieldsToUpdate.length === 0) return false;
    
    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => {
      const value = updates[field as keyof IEOperation];
      return field === 'isActive' ? (value ? 1 : 0) : value;
    });
    
    values.push(id);
    
    await db.run(`UPDATE tbl_IE_Op_Library SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, values);
    
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error updating IE operation:', error);
    return false;
  }
}

export async function deleteIEOperation(id: number): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('DELETE FROM tbl_IE_Op_Library WHERE id = ?', [id]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error deleting IE operation:', error);
    return false;
  }
}

// IE Operation Bulletin Functions
export async function getIEOBMaster(orderId: string): Promise<IEOBMaster[]> {
  try {
    const db = await getDb();
    const items = await db.all(
      `SELECT ob.*, op.operationName, op.standardSMV, op.machineType as defaultMachineType
       FROM tbl_IE_OB_Master ob
       LEFT JOIN tbl_IE_Op_Library op ON ob.opCode = op.opCode
       WHERE ob.orderId = ?
       ORDER BY ob.sequence`,
      [orderId]
    );
    
    return items.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching IE OB master:', error);
    return [];
  }
}

export async function createIEOBMaster(item: Omit<IEOBMaster, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_OB_Master 
       (orderId, productCode, sequence, opCode, componentName, machineType, smv, manpower, workstationId, priority, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.orderId,
        item.productCode,
        item.sequence,
        item.opCode,
        item.componentName,
        item.machineType,
        item.smv,
        item.manpower,
        item.workstationId,
        item.priority,
        item.notes,
        item.createdBy
      ]
    );
    
    resetDbCache();
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating IE OB master item:', error);
    throw error;
  }
}

export async function updateIEOBMaster(id: number, updates: Partial<IEOBMaster>): Promise<boolean> {
  try {
    const db = await getDb();
    
    const allowedFields = [
      'sequence', 'opCode', 'componentName', 'machineType', 'smv', 'manpower', 
      'workstationId', 'priority', 'notes'
    ];
    
    const fieldsToUpdate = Object.keys(updates).filter(key => 
      allowedFields.includes(key) && updates[key as keyof IEOBMaster] !== undefined
    );
    
    if (fieldsToUpdate.length === 0) return false;
    
    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => updates[field as keyof IEOBMaster]);
    values.push(id);
    
    await db.run(`UPDATE tbl_IE_OB_Master SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, values);
    
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error updating IE OB master:', error);
    return false;
  }
}

export async function deleteIEOBMaster(id: number): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('DELETE FROM tbl_IE_OB_Master WHERE id = ?', [id]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error deleting IE OB master item:', error);
    return false;
  }
}

// IE Line Balancing Functions
export async function getIELineBalance(lineId: string, orderId?: string): Promise<IELineBalance[]> {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM tbl_IE_Line_Balance WHERE lineId = ?';
    const params: any[] = [lineId];
    
    if (orderId) {
      query += ' AND orderId = ?';
      params.push(orderId);
    }
    
    query += ' ORDER BY sequence';
    
    const items = await db.all(query, ...params);
    return items.map((item: any) => ({
      ...item,
      assignedAt: new Date(item.assignedAt),
      startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
      completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching IE line balance:', error);
    return [];
  }
}

export async function createIELineBalance(item: Omit<IELineBalance, 'id' | 'assignedAt' | 'createdAt' | 'updatedAt'>): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_Line_Balance 
       (lineId, workstationId, orderId, sequence, employeeId, operationId, targetOutput, 
        taktTime, cycleTime, efficiency, status, startedAt, completedAt, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.lineId,
        item.workstationId,
        item.orderId,
        item.sequence,
        item.employeeId,
        item.operationId,
        item.targetOutput,
        item.taktTime,
        item.cycleTime,
        item.efficiency,
        item.status,
        item.startedAt,
        item.completedAt,
        item.createdBy
      ]
    );
    
    resetDbCache();
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating IE line balance item:', error);
    throw error;
  }
}

// Utility Functions
export async function getOperationCategories(): Promise<string[]> {
  try {
    const db = await getDb();
    const categories = await db.all('SELECT DISTINCT category FROM tbl_IE_Op_Library WHERE isActive = 1 ORDER BY category');
    return categories.map((cat: any) => cat.category);
  } catch (error) {
    console.error('Error fetching operation categories:', error);
    return [];
  }
}

export async function searchIEOperations(searchTerm: string): Promise<IEOperation[]> {
  try {
    const db = await getDb();
    const operations = await db.all(
      `SELECT * FROM tbl_IE_Op_Library 
       WHERE isActive = 1 
       AND (opCode LIKE ? OR operationName LIKE ? OR description LIKE ? OR category LIKE ?)
       ORDER BY category, operationName`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    
    return operations.map((op: any) => ({
      ...op,
      createdAt: new Date(op.createdAt),
      updatedAt: new Date(op.updatedAt)
    }));
  } catch (error) {
    console.error('Error searching IE operations:', error);
    return [];
  }
}

// Integration with existing HR module
export async function getOperatorsForOperation(opCode: string, skillLevel?: string): Promise<any[]> {
  try {
    const db = await getDb();
    
    let query = `
      SELECT e.*, op.skillLevelRequired
      FROM employees e
      JOIN tbl_IE_Op_Library op ON op.opCode = ?
      WHERE e.status = 'Active'
    `;
    const params: any[] = [opCode];
    
    if (skillLevel) {
      query += ' AND e.skills LIKE ?';
      params.push(`%"operation":"${opCode}"%"level":${skillLevel}%`);
    }
    
    query += ' ORDER BY e.name';
    
    return await db.all(query, ...params);
  } catch (error) {
    console.error('Error fetching operators for operation:', error);
    return [];
  }
}