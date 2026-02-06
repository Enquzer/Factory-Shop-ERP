import { getDb } from './db';

// Machine Database Schema and Functions

export interface Machine {
  id: number;
  machineCode: string;
  machineName: string;
  machineType: string;
  category: string;
  brand: string;
  model: string;
  capacity: number;
  unit: string; // units per hour, meters per minute, etc.
  powerRating: string;
  dimensions: string; // width x depth x height
  weight: number;
  installationArea: string;
  maintenanceSchedule: string;
  status: 'active' | 'maintenance' | 'inactive';
  department: string;
  lineSection: string; // Cutting, Sewing, Finishing, Packing
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface MachineLayout {
  id: number;
  layoutName: string;
  orderId: string;
  productCode: string;
  section: string; // Cutting, Sewing, Finishing, Packing
  machinePositions: Array<{
    machineId: number;
    x: number;
    y: number;
    rotation: number;
    sequence: number;
    operatorId?: string;
    operatorName?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface OperatorAssignment {
  id: number;
  orderId: string;
  machineId: number;
  operatorId: string;
  operationCode: string;
  startDate: Date;
  endDate: Date | null;
  status: 'active' | 'completed' | 'reassigned';
  efficiencyRating: number;
  createdAt: Date;
  updatedAt: Date;
}

// Machine CRUD Operations
export async function getMachines(category?: string, status: string = 'active'): Promise<Machine[]> {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM tbl_IE_Machines WHERE status = ?';
    const params: any[] = [status];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, machineName';
    const machines = await db.all(query, params);
    
    return machines.map((machine: any) => ({
      ...machine,
      createdAt: new Date(machine.createdAt),
      updatedAt: new Date(machine.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching machines:', error);
    return [];
  }
}

export async function getMachineById(id: number): Promise<Machine | null> {
  try {
    const db = await getDb();
    const machine = await db.get('SELECT * FROM tbl_IE_Machines WHERE id = ?', [id]);
    
    if (machine) {
      return {
        ...machine,
        createdAt: new Date(machine.createdAt),
        updatedAt: new Date(machine.updatedAt)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching machine by ID:', error);
    return null;
  }
}

export async function createMachine(machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_Machines 
       (machineCode, machineName, machineType, category, brand, model, capacity, unit, 
        powerRating, dimensions, weight, installationArea, maintenanceSchedule, 
        status, department, lineSection, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        machine.machineCode,
        machine.machineName,
        machine.machineType,
        machine.category,
        machine.brand,
        machine.model,
        machine.capacity,
        machine.unit,
        machine.powerRating,
        machine.dimensions,
        machine.weight,
        machine.installationArea,
        machine.maintenanceSchedule,
        machine.status,
        machine.department,
        machine.lineSection,
        machine.createdBy
      ]
    );
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating machine:', error);
    throw error;
  }
}

export async function updateMachine(id: number, updates: Partial<Machine>): Promise<boolean> {
  try {
    const db = await getDb();
    const updateFields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(updates).filter((_, index) => {
      const key = Object.keys(updates)[index];
      return key !== 'id' && key !== 'createdAt';
    });
    
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.run(
      `UPDATE tbl_IE_Machines SET ${updateFields}, updatedAt = ? WHERE id = ?`,
      values
    );
    return true;
  } catch (error) {
    console.error('Error updating machine:', error);
    return false;
  }
}

export async function deleteMachine(id: number): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('DELETE FROM tbl_IE_Machines WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting machine:', error);
    return false;
  }
}

// Layout Operations
export async function getLayouts(orderId?: string): Promise<MachineLayout[]> {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM tbl_IE_Machine_Layouts';
    const params: any[] = [];
    
    if (orderId) {
      query += ' WHERE orderId = ?';
      params.push(orderId);
    }
    
    query += ' ORDER BY createdAt DESC';
    const layouts = await db.all(query, params);
    
    return layouts.map((layout: any) => ({
      ...layout,
      machinePositions: layout.machinePositions ? JSON.parse(layout.machinePositions) : [],
      createdAt: new Date(layout.createdAt),
      updatedAt: new Date(layout.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching layouts:', error);
    return [];
  }
}

export async function createLayout(layout: Omit<MachineLayout, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_Machine_Layouts 
       (layoutName, orderId, productCode, section, machinePositions, createdBy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        layout.layoutName,
        layout.orderId,
        layout.productCode,
        layout.section,
        JSON.stringify(layout.machinePositions),
        layout.createdBy
      ]
    );
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating layout:', error);
    throw error;
  }
}

export async function updateLayout(id: number, updates: Partial<MachineLayout>): Promise<boolean> {
  try {
    const db = await getDb();
    const updateFields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(updates).filter((_, index) => {
      const key = Object.keys(updates)[index];
      return key !== 'id' && key !== 'createdAt';
    });
    
    if (updates.machinePositions) {
      values[values.indexOf(updates.machinePositions)] = JSON.stringify(updates.machinePositions);
    }
    
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.run(
      `UPDATE tbl_IE_Machine_Layouts SET ${updateFields}, updatedAt = ? WHERE id = ?`,
      values
    );
    return true;
  } catch (error) {
    console.error('Error updating layout:', error);
    return false;
  }
}

export async function getLayoutById(id: number): Promise<MachineLayout | null> {
  try {
    const db = await getDb();
    const layout = await db.get('SELECT * FROM tbl_IE_Machine_Layouts WHERE id = ?', [id]);
    
    if (layout) {
      return {
        ...layout,
        machinePositions: layout.machinePositions ? JSON.parse(layout.machinePositions) : [],
        createdAt: new Date(layout.createdAt),
        updatedAt: new Date(layout.updatedAt)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching layout by ID:', error);
    return null;
  }
}

export async function deleteLayout(id: number): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('DELETE FROM tbl_IE_Machine_Layouts WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting layout:', error);
    return false;
  }
}

// Operator Assignment Operations
export async function getOperatorAssignments(orderId?: string): Promise<OperatorAssignment[]> {
  try {
    const db = await getDb();
    let query = `
      SELECT oa.*, m.machineName, m.machineType, e.name as operatorName
      FROM tbl_IE_Operator_Assignments oa
      JOIN tbl_IE_Machines m ON oa.machineId = m.id
      JOIN employees e ON oa.operatorId = e.employeeId
    `;
    const params: any[] = [];
    
    if (orderId) {
      query += ' WHERE oa.orderId = ?';
      params.push(orderId);
    }
    
    query += ' ORDER BY oa.startDate DESC';
    const assignments = await db.all(query, params);
    
    return assignments.map((assignment: any) => ({
      ...assignment,
      startDate: new Date(assignment.startDate),
      endDate: assignment.endDate ? new Date(assignment.endDate) : null,
      createdAt: new Date(assignment.createdAt),
      updatedAt: new Date(assignment.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching operator assignments:', error);
    return [];
  }
}

export async function createOperatorAssignment(assignment: Omit<OperatorAssignment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { createdBy: string }): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_Operator_Assignments 
       (orderId, machineId, operatorId, operationCode, startDate, endDate, status, efficiencyRating, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.orderId,
        assignment.machineId,
        assignment.operatorId,
        assignment.operationCode,
        assignment.startDate.toISOString(),
        assignment.endDate ? assignment.endDate.toISOString() : null,
        assignment.status,
        assignment.efficiencyRating,
        assignment.createdBy
      ]
    );
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating operator assignment:', error);
    throw error;
  }
}

export async function updateOperatorAssignment(id: number, updates: Partial<OperatorAssignment>): Promise<boolean> {
  try {
    const db = await getDb();
    const updateFields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(updates).filter((_, index) => {
      const key = Object.keys(updates)[index];
      return key !== 'id' && key !== 'createdAt';
    });
    
    // Handle date conversions
    const startDateIndex = Object.keys(updates).indexOf('startDate');
    if (startDateIndex !== -1 && updates.startDate) {
      values[startDateIndex] = (updates.startDate as Date).toISOString();
    }
    
    const endDateIndex = Object.keys(updates).indexOf('endDate');
    if (endDateIndex !== -1 && updates.endDate) {
      values[endDateIndex] = (updates.endDate as Date).toISOString();
    }
    
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.run(
      `UPDATE tbl_IE_Operator_Assignments SET ${updateFields}, updatedAt = ? WHERE id = ?`,
      values
    );
    return true;
  } catch (error) {
    console.error('Error updating operator assignment:', error);
    return false;
  }
}

// Get machine categories for dropdowns
export async function getMachineCategories(): Promise<string[]> {
  try {
    const db = await getDb();
    const categories = await db.all('SELECT DISTINCT category FROM tbl_IE_Machines WHERE status = "active" ORDER BY category');
    return categories.map((cat: any) => cat.category);
  } catch (error) {
    console.error('Error fetching machine categories:', error);
    return [];
  }
}

// Get machine types for dropdowns
export async function getMachineTypes(): Promise<string[]> {
  try {
    const db = await getDb();
    const types = await db.all('SELECT DISTINCT machineType FROM tbl_IE_Machines WHERE status = "active" ORDER BY machineType');
    return types.map((type: any) => type.machineType);
  } catch (error) {
    console.error('Error fetching machine types:', error);
    return [];
  }
}

// Get available operators for assignment
export async function getAvailableOperators(skillRequired?: string): Promise<any[]> {
  try {
    const db = await getDb();
    let query = `
      SELECT e.employeeId, e.name, e.jobCenter, e.skills
      FROM employees e
      WHERE (e.status = 'Active' OR e.status = 'active')
      AND (
        e.jobCenter LIKE '%operator%' OR 
        e.jobCenter LIKE '%Oprator%' OR 
        e.jobCenter LIKE '%Sewing%' OR 
        e.jobCenter LIKE '%Cutting%' OR 
        e.jobCenter LIKE '%Packing%' OR 
        e.jobCenter LIKE '%Finishing%' OR
        e.jobCenter LIKE '%Helper%'
      )
    `;
    const params: any[] = [];
    
    if (skillRequired) {
      query += ' AND e.skills LIKE ?';
      params.push(`%${skillRequired}%`);
    }
    
    query += ' ORDER BY e.name';
    return await db.all(query, params);
  } catch (error) {
    console.error('Error fetching available operators:', error);
    return [];
  }
}