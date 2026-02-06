const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function createIETables() {
  try {
    const db = await open({
      filename: path.join(process.cwd(), '..', 'db', 'carement.db'),
      driver: sqlite3.Database
    });
    
    console.log('Creating IE module tables...');
    
    // 1. tbl_IE_Op_Library - Master library of sewing operations with GSD/Pro-SMV data
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_Op_Library (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opCode TEXT UNIQUE NOT NULL,
        operationName TEXT NOT NULL,
        category TEXT NOT NULL, -- Cutting, Sewing, Finishing, Packing, etc.
        description TEXT,
        standardSMV REAL NOT NULL DEFAULT 0, -- Standard Minute Value
        machineType TEXT,
        skillLevelRequired TEXT, -- Beginner, Intermediate, Advanced
        complexity INTEGER, -- 1-5 scale
        department TEXT, -- Department this operation belongs to
        isActive INTEGER DEFAULT 1,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. tbl_IE_OB_Master - Style-specific operation bulletin sequences
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_OB_Master (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        productCode TEXT,
        sequence INTEGER NOT NULL,
        opCode TEXT NOT NULL,
        componentName TEXT,
        machineType TEXT,
        smv REAL DEFAULT 0,
        manpower INTEGER DEFAULT 1,
        workstationId TEXT,
        priority INTEGER DEFAULT 0,
        notes TEXT,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (opCode) REFERENCES tbl_IE_Op_Library(opCode) ON UPDATE CASCADE,
        FOREIGN KEY (orderId) REFERENCES marketing_orders(id) ON DELETE CASCADE
      )
    `);
    
    // 3. tbl_IE_Line_Balance - Workstation assignments and line balancing
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_Line_Balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lineId TEXT NOT NULL,
        workstationId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        employeeId TEXT NOT NULL,
        operationId INTEGER NOT NULL,
        targetOutput INTEGER DEFAULT 0, -- pcs/hour
        taktTime REAL DEFAULT 0, -- seconds
        cycleTime REAL DEFAULT 0, -- seconds
        efficiency REAL DEFAULT 0,
        status TEXT DEFAULT 'Assigned', -- Assigned, InProgress, Completed
        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        startedAt DATETIME,
        completedAt DATETIME,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON UPDATE CASCADE,
        FOREIGN KEY (operationId) REFERENCES tbl_IE_Op_Library(id) ON UPDATE CASCADE,
        FOREIGN KEY (orderId) REFERENCES marketing_orders(id) ON DELETE CASCADE
      )
    `);
    
    // 4. tbl_IE_SAM_History - Standard Allowed Minutes tracking with version control
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_SAM_History (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        opCode TEXT NOT NULL,
        componentName TEXT,
        oldSAM REAL DEFAULT 0,
        newSAM REAL NOT NULL,
        changePercentage REAL DEFAULT 0,
        reason TEXT,
        approvedBy TEXT,
        requiresCostingApproval INTEGER DEFAULT 0, -- Flag for >5% changes
        costingApproved INTEGER DEFAULT 0,
        costingApprovedBy TEXT,
        costingApprovedAt DATETIME,
        notes TEXT,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (opCode) REFERENCES tbl_IE_Op_Library(opCode) ON UPDATE CASCADE,
        FOREIGN KEY (orderId) REFERENCES marketing_orders(id) ON DELETE CASCADE
      )
    `);
    
    // 5. tbl_IE_Resource_Conflicts - Machine/resource availability tracking
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_Resource_Conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resourceType TEXT NOT NULL, -- Machine, Operator, Line, etc.
        resourceId TEXT NOT NULL, -- Machine serial number, employeeId, etc.
        conflictType TEXT NOT NULL, -- Maintenance, Unavailable, Overallocated
        orderId TEXT,
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        description TEXT,
        resolved INTEGER DEFAULT 0,
        resolvedBy TEXT,
        resolvedAt DATETIME,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 6. tbl_IE_Efficiency_Logs - Real-time efficiency monitoring
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_Efficiency_Logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lineId TEXT NOT NULL,
        workstationId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        employeeId TEXT,
        operationId INTEGER,
        startTime DATETIME,
        endTime DATETIME,
        actualOutput INTEGER DEFAULT 0,
        standardTime REAL DEFAULT 0, -- SAM in minutes
        actualTime REAL DEFAULT 0, -- minutes worked
        efficiency REAL DEFAULT 0, -- (Actual Output × SAM) / (Manpower × Minutes Worked)
        pitchTime REAL DEFAULT 0, -- Target time per piece
        variance REAL DEFAULT 0, -- Difference between actual and pitch time
        status TEXT DEFAULT 'Normal', -- Normal, Warning, Critical
        loggedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId) ON UPDATE CASCADE,
        FOREIGN KEY (operationId) REFERENCES tbl_IE_Op_Library(id) ON UPDATE CASCADE,
        FOREIGN KEY (orderId) REFERENCES marketing_orders(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ie_op_library_opCode ON tbl_IE_Op_Library(opCode);
      CREATE INDEX IF NOT EXISTS idx_ie_op_library_category ON tbl_IE_Op_Library(category);
      CREATE INDEX IF NOT EXISTS idx_ie_ob_master_orderId ON tbl_IE_OB_Master(orderId);
      CREATE INDEX IF NOT EXISTS idx_ie_line_balance_orderId ON tbl_IE_Line_Balance(orderId);
      CREATE INDEX IF NOT EXISTS idx_ie_sam_history_orderId ON tbl_IE_SAM_History(orderId);
      CREATE INDEX IF NOT EXISTS idx_ie_efficiency_logs_workstation ON tbl_IE_Efficiency_Logs(workstationId, loggedAt);
    `);
    
    await db.close();
    console.log('IE tables created successfully');
    
    // Seed initial operation library data
    console.log('Seeding operation library data...');
    await seedOperationLibrary(db);
    
  } catch (error) {
    console.error('Error creating IE tables:', error);
    throw error;
  }
}

async function seedOperationLibrary() {
  const db = await open({
    filename: path.join(process.cwd(), '..', 'db', 'carement.db'),
    driver: sqlite3.Database
  });
  const operations = [
    // Cutting Operations
    { opCode: 'CUT001', operationName: 'Fabric Cutting', category: 'Cutting', description: 'Basic fabric cutting operations', standardSMV: 0.05, machineType: 'Cutting Machine', skillLevelRequired: 'Beginner', complexity: 2, department: 'Cutting' },
    { opCode: 'CUT002', operationName: 'Pattern Matching', category: 'Cutting', description: 'Advanced pattern matching and alignment', standardSMV: 0.08, machineType: 'Cutting Machine', skillLevelRequired: 'Advanced', complexity: 4, department: 'Cutting' },
    
    // Sewing Operations - Basic
    { opCode: 'SEW001', operationName: 'Sleeve Joining', category: 'Sewing', description: 'Attaching sleeves to body panels', standardSMV: 0.019, machineType: 'Overlock Machine', skillLevelRequired: 'Intermediate', complexity: 3, department: 'Sewing' },
    { opCode: 'SEW002', operationName: 'Front Attachment', category: 'Sewing', description: 'Attaching front body pieces', standardSMV: 0.025, machineType: 'Single Needle Machine', skillLevelRequired: 'Intermediate', complexity: 3, department: 'Sewing' },
    { opCode: 'SEW003', operationName: 'Collar Attaching', category: 'Sewing', description: 'Collar to neck joining operations', standardSMV: 0.017, machineType: 'Specialised Attachment', skillLevelRequired: 'Advanced', complexity: 4, department: 'Sewing' },
    { opCode: 'SEW004', operationName: 'Pocket Setting', category: 'Sewing', description: 'Pocket placement and attachment', standardSMV: 0.012, machineType: 'Single Needle Machine', skillLevelRequired: 'Beginner', complexity: 2, department: 'Sewing' },
    
    // Sewing Operations - Advanced
    { opCode: 'SEW005', operationName: 'Zipper Installation', category: 'Sewing', description: 'Invisible zipper application', standardSMV: 0.028, machineType: 'Zipper Foot Machine', skillLevelRequired: 'Advanced', complexity: 5, department: 'Sewing' },
    { opCode: 'SEW006', operationName: 'Buttonhole Making', category: 'Sewing', description: 'Buttonhole creation and finishing', standardSMV: 0.008, machineType: 'Buttonhole Machine', skillLevelRequired: 'Intermediate', complexity: 3, department: 'Sewing' },
    { opCode: 'SEW007', operationName: 'Button Attaching', category: 'Sewing', description: 'Button sewing and attachment', standardSMV: 0.005, machineType: 'Button Sewing Machine', skillLevelRequired: 'Beginner', complexity: 2, department: 'Sewing' },
    
    // Finishing Operations
    { opCode: 'FIN001', operationName: 'Side Seam Joining', category: 'Finishing', description: 'Side seam construction', standardSMV: 0.015, machineType: 'Overlock Machine', skillLevelRequired: 'Intermediate', complexity: 3, department: 'Finishing' },
    { opCode: 'FIN002', operationName: 'Hemming', category: 'Finishing', description: 'Bottom hem finishing', standardSMV: 0.022, machineType: 'Cover Hem Machine', skillLevelRequired: 'Intermediate', complexity: 3, department: 'Finishing' },
    { opCode: 'FIN003', operationName: 'Neckline Finishing', category: 'Finishing', description: 'Neckline edge finishing', standardSMV: 0.018, machineType: 'Overlock Machine', skillLevelRequired: 'Advanced', complexity: 4, department: 'Finishing' },
    
    // Quality Control
    { opCode: 'QC001', operationName: 'Quality Inspection', category: 'Quality', description: 'Final quality check and inspection', standardSMV: 0.01, machineType: 'Inspection Table', skillLevelRequired: 'Intermediate', complexity: 2, department: 'Quality' },
    { opCode: 'QC002', operationName: 'Defect Repair', category: 'Quality', description: 'Defect identification and repair', standardSMV: 0.03, machineType: 'Repair Station', skillLevelRequired: 'Advanced', complexity: 4, department: 'Quality' },
    
    // Packing Operations
    { opCode: 'PACK001', operationName: 'Folding', category: 'Packing', description: 'Garment folding operations', standardSMV: 0.008, machineType: 'Folding Table', skillLevelRequired: 'Beginner', complexity: 1, department: 'Packing' },
    { opCode: 'PACK002', operationName: 'Packing', category: 'Packing', description: 'Final product packaging', standardSMV: 0.012, machineType: 'Packing Station', skillLevelRequired: 'Beginner', complexity: 1, department: 'Packing' },
    { opCode: 'PACK003', operationName: 'Label Attaching', category: 'Packing', description: 'Size label and care label attachment', standardSMV: 0.005, machineType: 'Label Applicator', skillLevelRequired: 'Beginner', complexity: 1, department: 'Packing' }
  ];

  for (const op of operations) {
    await db.run(`
      INSERT OR IGNORE INTO tbl_IE_Op_Library 
      (opCode, operationName, category, description, standardSMV, machineType, skillLevelRequired, complexity, department, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      op.opCode, op.operationName, op.category, op.description, op.standardSMV, 
      op.machineType, op.skillLevelRequired, op.complexity, op.department, 'system'
    ]);
  }
  
  await db.close();
  console.log(`Seeded ${operations.length} operations into operation library`);
}

// Run the script
if (require.main === module) {
  createIETables()
    .then(() => {
      console.log('IE tables setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to setup IE tables:', error);
      process.exit(1);
    });
}

module.exports = { createIETables, seedOperationLibrary };