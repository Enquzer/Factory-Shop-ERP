import { getDb } from './db';

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  userId?: number;
  username?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

// Log an audit entry
export async function logAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await getDb();
    
    // Generate a simple ID
    const auditId = `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    await db.run(`
      INSERT INTO audit_logs (id, userId, username, action, resourceType, resourceId, details, ipAddress, userAgent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      auditId,
      entry.userId || null,
      entry.username || null,
      entry.action,
      entry.resourceType,
      entry.resourceId || null,
      entry.details || null,
      entry.ipAddress || null,
      entry.userAgent || null,
      new Date().toISOString()
    );
    
    console.log('Audit log entry created:', { ...entry, id: auditId });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw error as audit logging should not break the main functionality
  }
}

// Get audit logs with optional filtering
export async function getAuditLogs(
  limit: number = 50,
  offset: number = 0,
  filters?: {
    userId?: number;
    username?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AuditLogEntry[]> {
  try {
    const db = await getDb();
    
    let query = `
      SELECT * FROM audit_logs 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters?.userId) {
      query += ` AND userId = ?`;
      params.push(filters.userId);
    }
    
    if (filters?.username) {
      query += ` AND username = ?`;
      params.push(filters.username);
    }
    
    if (filters?.action) {
      query += ` AND action = ?`;
      params.push(filters.action);
    }
    
    if (filters?.resourceType) {
      query += ` AND resourceType = ?`;
      params.push(filters.resourceType);
    }
    
    if (filters?.startDate) {
      query += ` AND timestamp >= ?`;
      params.push(filters.startDate);
    }
    
    if (filters?.endDate) {
      query += ` AND timestamp <= ?`;
      params.push(filters.endDate);
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const logs = await db.all(query, ...params);
    
    return logs.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }));
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }
}

// Initialize audit logs table
export async function initializeAuditLogsTable() {
  try {
    const db = await getDb();
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        userId INTEGER,
        username TEXT,
        action TEXT NOT NULL,
        resourceType TEXT NOT NULL,
        resourceId TEXT,
        details TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Audit logs table initialized successfully');
  } catch (error) {
    console.error('Failed to initialize audit logs table:', error);
  }
}