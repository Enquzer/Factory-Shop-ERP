import { getDb } from './db';

export interface ResourcePlan {
  id: number;
  planName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'Draft' | 'Active' | 'Archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: number;
  planId: number;
  resourceType: 'Machine' | 'Operator';
  resourceId: string | number;
  resourceName?: string;
  shift: string;
  notes: string;
}

/**
 * Initialize Resource Planning Tables
 */
export async function initializeResourcePlanningTables() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tbl_IE_Resource_Plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planName TEXT NOT NULL,
      description TEXT,
      startDate DATETIME NOT NULL,
      endDate DATETIME NOT NULL,
      status TEXT DEFAULT 'Active',
      createdBy TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tbl_IE_Resource_Allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planId INTEGER NOT NULL,
      resourceType TEXT NOT NULL,
      resourceId TEXT NOT NULL,
      shift TEXT,
      notes TEXT,
      FOREIGN KEY (planId) REFERENCES tbl_IE_Resource_Plans(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Get all resource plans
 */
export async function getResourcePlans() {
  await initializeResourcePlanningTables();
  const db = await getDb();
  return await db.all('SELECT * FROM tbl_IE_Resource_Plans ORDER BY createdAt DESC');
}

/**
 * Get a specific resource plan with allocations
 */
export async function getResourcePlanById(id: number) {
  const db = await getDb();
  const plan = await db.get('SELECT * FROM tbl_IE_Resource_Plans WHERE id = ?', [id]);
  
  if (!plan) return null;

  const allocations = await db.all(`
    SELECT ra.*, 
      CASE 
        WHEN ra.resourceType = 'Machine' THEN m.machineName 
        WHEN ra.resourceType = 'Operator' THEN e.name 
      END as resourceName
    FROM tbl_IE_Resource_Allocations ra
    LEFT JOIN tbl_IE_Machines m ON ra.resourceType = 'Machine' AND CAST(ra.resourceId AS INTEGER) = m.id
    LEFT JOIN employees e ON ra.resourceType = 'Operator' AND ra.resourceId = e.employeeId
    WHERE ra.planId = ?
  `, [id]);

  return {
    ...plan,
    allocations
  };
}

/**
 * Create a new resource plan
 */
export async function createResourcePlan(plan: Omit<ResourcePlan, 'id' | 'createdAt' | 'updatedAt'>, allocations: Omit<ResourceAllocation, 'id' | 'planId'>[]) {
  const db = await getDb();
  
  await db.run('BEGIN TRANSACTION');
  
  try {
    const planResult = await db.run(
      `INSERT INTO tbl_IE_Resource_Plans (planName, description, startDate, endDate, status, createdBy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plan.planName, plan.description, plan.startDate, plan.endDate, plan.status, plan.createdBy]
    );
    
    const planId = planResult.lastID;
    
    for (const alloc of allocations) {
      await db.run(
        `INSERT INTO tbl_IE_Resource_Allocations (planId, resourceType, resourceId, shift, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [planId, alloc.resourceType, alloc.resourceId, alloc.shift, alloc.notes]
      );
    }
    
    await db.run('COMMIT');
    return { success: true, planId };
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error creating resource plan:', error);
    throw error;
  }
}

/**
 * Update a resource plan
 */
export async function updateResourcePlan(id: number, plan: Partial<ResourcePlan>, allocations?: Omit<ResourceAllocation, 'id' | 'planId'>[]) {
  const db = await getDb();
  
  await db.run('BEGIN TRANSACTION');
  
  try {
    if (Object.keys(plan).length > 0) {
      const fields = Object.keys(plan).filter(f => f !== 'id' && f !== 'createdAt' && f !== 'updatedAt');
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => (plan as any)[f]);
      
      await db.run(
        `UPDATE tbl_IE_Resource_Plans SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
    }
    
    if (allocations) {
      // Re-link allocations (delete and insert)
      await db.run('DELETE FROM tbl_IE_Resource_Allocations WHERE planId = ?', [id]);
      
      for (const alloc of allocations) {
        await db.run(
          `INSERT INTO tbl_IE_Resource_Allocations (planId, resourceType, resourceId, shift, notes)
           VALUES (?, ?, ?, ?, ?)`,
          [id, alloc.resourceType, alloc.resourceId, alloc.shift, alloc.notes]
        );
      }
    }
    
    await db.run('COMMIT');
    return { success: true };
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error updating resource plan:', error);
    throw error;
  }
}

/**
 * Delete a resource plan
 */
export async function deleteResourcePlan(id: number) {
  const db = await getDb();
  await db.run('DELETE FROM tbl_IE_Resource_Plans WHERE id = ?', [id]);
  // Allocations will be deleted by CASCADE if supported, but let's be safe
  await db.run('DELETE FROM tbl_IE_Resource_Allocations WHERE planId = ?', [id]);
  return { success: true };
}
