
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupHRTables() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Connected to database. Creating HR tables...');

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        jobCenter TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        joinedDate TEXT,
        status TEXT DEFAULT 'Active',
        profilePicture TEXT,
        skills TEXT,
        attendanceDays INTEGER DEFAULT 0,
        disciplinaryFines REAL DEFAULT 0,
        qualityPenalties REAL DEFAULT 0,
        baseSalary REAL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS operation_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        opCode TEXT UNIQUE NOT NULL,
        opName TEXT NOT NULL,
        ratePerPcs REAL NOT NULL,
        jobCenter TEXT DEFAULT 'Sewing machine operator'
      );

      CREATE TABLE IF NOT EXISTS employee_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        opCode TEXT NOT NULL,
        machineId TEXT,
        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Assigned',
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId)
      );

      CREATE TABLE IF NOT EXISTS daily_production_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        opCode TEXT NOT NULL,
        unitsProduced INTEGER NOT NULL,
        machineId TEXT,
        date TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId)
      );
    `);

    console.log('HR tables created successfully.');

    // Seed some initial Job Center Bonus Rates if needed, but let's just stick to schema for now.
    // Actually, the user provided a JOB_CENTER_MULTIPLIERS list.
    
    // Seed some sample operation rates
    const sampleRates = [
      { opCode: 'CUT001', opName: 'Cutting', ratePerPcs: 0.05, jobCenter: 'Cutting operators' },
      { opCode: 'SEW001', opName: 'Sleeve Joining', ratePerPcs: 0.019, jobCenter: 'Sewing machine operator' },
      { opCode: 'SEW002', opName: 'Front Attachment', ratePerPcs: 0.025, jobCenter: 'Sewing machine operator' },
      { opCode: 'QC001', opName: 'Quality Check', ratePerPcs: 0.01, jobCenter: 'QC operators' },
      { opCode: 'PACK001', opName: 'Packing', ratePerPcs: 0.008, jobCenter: 'Packing operators' },
      { opCode: 'IRON001', opName: 'Ironing', ratePerPcs: 0.012, jobCenter: 'Ironing operators' }
    ];

    for (const rate of sampleRates) {
      await db.run(
        'INSERT OR IGNORE INTO operation_rates (opCode, opName, ratePerPcs, jobCenter) VALUES (?, ?, ?, ?)',
        [rate.opCode, rate.opName, rate.ratePerPcs, rate.jobCenter]
      );
    }
    
    console.log('Sample operation rates seeded.');

  } catch (error) {
    console.error('Error setting up HR tables:', error);
  } finally {
    await db.close();
  }
}

setupHRTables();
