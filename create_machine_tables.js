const { getDb } = require('./dist/lib/db');

async function createMachineTables() {
  try {
    const db = await getDb();
    
    // Create Machines table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_Machines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machineCode TEXT UNIQUE NOT NULL,
        machineName TEXT NOT NULL,
        machineType TEXT NOT NULL,
        category TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        capacity REAL DEFAULT 0,
        unit TEXT,
        powerRating TEXT,
        dimensions TEXT,
        weight REAL,
        installationArea TEXT,
        maintenanceSchedule TEXT,
        status TEXT DEFAULT 'active',
        department TEXT,
        lineSection TEXT,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Machine Layouts table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_Machine_Layouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        layoutName TEXT NOT NULL,
        orderId TEXT,
        productCode TEXT,
        section TEXT,
        machinePositions TEXT,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Operator Assignments table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tbl_IE_Operator_Assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        machineId INTEGER NOT NULL,
        operatorId TEXT NOT NULL,
        operationCode TEXT NOT NULL,
        startDate DATETIME NOT NULL,
        endDate DATETIME,
        status TEXT DEFAULT 'active',
        efficiencyRating REAL DEFAULT 0,
        createdBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (machineId) REFERENCES tbl_IE_Machines (id)
      )
    `);

    // Create indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_machines_category ON tbl_IE_Machines (category);
      CREATE INDEX IF NOT EXISTS idx_machines_status ON tbl_IE_Machines (status);
      CREATE INDEX IF NOT EXISTS idx_machines_section ON tbl_IE_Machines (lineSection);
      CREATE INDEX IF NOT EXISTS idx_layouts_order ON tbl_IE_Machine_Layouts (orderId);
      CREATE INDEX IF NOT EXISTS idx_layouts_section ON tbl_IE_Machine_Layouts (section);
      CREATE INDEX IF NOT EXISTS idx_assignments_order ON tbl_IE_Operator_Assignments (orderId);
      CREATE INDEX IF NOT EXISTS idx_assignments_machine ON tbl_IE_Operator_Assignments (machineId);
      CREATE INDEX IF NOT EXISTS idx_assignments_operator ON tbl_IE_Operator_Assignments (operatorId);
      CREATE INDEX IF NOT EXISTS idx_assignments_status ON tbl_IE_Operator_Assignments (status);
    `);

    console.log('✅ IE Machine tables created successfully');
    
    // Check if tables exist
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('tbl_IE_Machines', 'tbl_IE_Machine_Layouts', 'tbl_IE_Operator_Assignments')
    `);
    
    console.log('Created tables:', tables.map(t => t.name));
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error creating IE Machine tables:', error);
    process.exit(1);
  }
}

createMachineTables()
  .then(() => {
    console.log('✅ Machine database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Machine database setup failed:', error);
    process.exit(1);
  });