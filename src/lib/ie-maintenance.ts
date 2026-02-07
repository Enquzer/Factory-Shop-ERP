import { getDb } from './db';

export interface MaintenanceSchedule {
  id: number;
  machineId: number;
  machineCode: string;
  machineName: string;
  maintenanceType: 'Preventive' | 'Full Overhaul' | 'Regular Cleanup';
  scheduledDate: string;
  status: 'Scheduled' | 'In-Progress' | 'Completed' | 'Overdue';
  notes: string;
  performedBy: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Initialize Maintenance Tables
 */
export async function initializeMaintenanceTables() {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tbl_IE_Machine_Maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machineId INTEGER NOT NULL,
      maintenanceType TEXT NOT NULL,
      scheduledDate DATETIME NOT NULL,
      status TEXT DEFAULT 'Scheduled',
      notes TEXT,
      performedBy TEXT,
      completedDate DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (machineId) REFERENCES tbl_IE_Machines(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Get all maintenance schedules
 */
export async function getMaintenanceSchedules() {
  await initializeMaintenanceTables();
  const db = await getDb();
  
  return await db.all(`
    SELECT mm.*, m.machineCode, m.machineName
    FROM tbl_IE_Machine_Maintenance mm
    JOIN tbl_IE_Machines m ON mm.machineId = m.id
    ORDER BY mm.scheduledDate ASC
  `);
}

/**
 * Create a new maintenance schedule
 */
export async function createMaintenanceSchedule(data: Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt' | 'machineCode' | 'machineName'>) {
  const db = await getDb();
  const result = await db.run(
    `INSERT INTO tbl_IE_Machine_Maintenance (machineId, maintenanceType, scheduledDate, status, notes, performedBy)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.machineId, data.maintenanceType, data.scheduledDate, data.status, data.notes, data.performedBy]
  );
  return result.lastID;
}

/**
 * Update a maintenance schedule
 */
export async function updateMaintenanceSchedule(id: number, updates: Partial<MaintenanceSchedule>) {
  const db = await getDb();
  const allowedFields = ['maintenanceType', 'scheduledDate', 'status', 'notes', 'performedBy', 'completedDate'];
  const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key));
  
  if (fieldsToUpdate.length === 0) return false;
  
  const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
  const values = fieldsToUpdate.map(field => (updates as any)[field]);
  values.push(id);
  
  await db.run(
    `UPDATE tbl_IE_Machine_Maintenance SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );
  return true;
}

/**
 * Delete a maintenance schedule
 */
export async function deleteMaintenanceSchedule(id: number) {
  const db = await getDb();
  await db.run('DELETE FROM tbl_IE_Machine_Maintenance WHERE id = ?', [id]);
  return true;
}

/**
 * Get maintenance reports/stats
 */
export async function getMaintenanceStats() {
  const db = await getDb();
  
  const stats = {
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    byType: {} as Record<string, number>
  };
  
  const rows = await db.all('SELECT status, maintenanceType, scheduledDate FROM tbl_IE_Machine_Maintenance');
  const now = new Date();
  
  rows.forEach((row: any) => {
    stats.total++;
    
    // Check if overdue
    if (row.status !== 'Completed' && new Date(row.scheduledDate) < now) {
      stats.overdue++;
    } else {
      const statusKey = row.status.charAt(0).toLowerCase() + row.status.slice(1).replace('-', '');
      if (row.status === 'Scheduled') stats.scheduled++;
      if (row.status === 'In-Progress') stats.inProgress++;
      if (row.status === 'Completed') stats.completed++;
    }
    
    stats.byType[row.maintenanceType] = (stats.byType[row.maintenanceType] || 0) + 1;
  });
  
  return stats;
}

/**
 * Get maintenance history for a specific machine
 */
export async function getMachineMaintenanceHistory(machineId: number) {
  const db = await getDb();
  return await db.all(`
    SELECT mm.*, m.machineCode, m.machineName
    FROM tbl_IE_Machine_Maintenance mm
    JOIN tbl_IE_Machines m ON mm.machineId = m.id
    WHERE mm.machineId = ?
    ORDER BY mm.scheduledDate DESC
  `, [machineId]);
}
