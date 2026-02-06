const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(process.cwd(), 'db', 'carement.db');

async function fixLineBalancingTables() {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Starting DB fix for Line Balancing...');

      // 1. Drop the incorrect table if it has the wrong columns
      // (Checking for orderId but no productCode)
      db.get("PRAGMA table_info(tbl_IE_Line_Balance)", (err, rows) => {
          // We'll just drop and recreate it to be sure it matches the library
          db.run("DROP TABLE IF EXISTS tbl_IE_Line_Balance");
          console.log('Dropped tbl_IE_Line_Balance');

          // 2. Create the CORRECT Line Balance table (Header)
          db.run(`
            CREATE TABLE IF NOT EXISTS tbl_IE_Line_Balance (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              orderId TEXT NOT NULL,
              productCode TEXT NOT NULL,
              lineName TEXT NOT NULL,
              section TEXT NOT NULL,
              targetOutput INTEGER NOT NULL,
              workingHours INTEGER DEFAULT 8,
              numberOfWorkstations INTEGER NOT NULL,
              totalSMV REAL NOT NULL,
              calculatedCycleTime REAL NOT NULL,
              actualCycleTime REAL NOT NULL,
              lineEfficiency REAL DEFAULT 0,
              bottleneckWorkstationId INTEGER,
              status TEXT DEFAULT 'planned',
              createdBy TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log('Recreated tbl_IE_Line_Balance with correct header format');

          // 3. Create the Operation Assignments table (Junction)
          db.run(`
            CREATE TABLE IF NOT EXISTS tbl_IE_Operation_Assignments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              lineBalanceId INTEGER NOT NULL,
              workstationId INTEGER NOT NULL,
              operationCode TEXT NOT NULL,
              sequence INTEGER NOT NULL,
              smv REAL NOT NULL,
              assignedOperator TEXT,
              startTime DATETIME NOT NULL,
              endTime DATETIME NOT NULL,
              status TEXT DEFAULT 'pending',
              createdBy TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (lineBalanceId) REFERENCES tbl_IE_Line_Balance (id),
              FOREIGN KEY (workstationId) REFERENCES tbl_IE_Workstations (id)
            )
          `);
          console.log('Ensured tbl_IE_Operation_Assignments exists');

          // 4. Ensure tbl_IE_Workstations exists (in case it wasn't created)
          db.run(`
            CREATE TABLE IF NOT EXISTS tbl_IE_Workstations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              workstationCode TEXT UNIQUE NOT NULL,
              workstationName TEXT NOT NULL,
              section TEXT NOT NULL,
              capacity INTEGER DEFAULT 0,
              currentLoad INTEGER DEFAULT 0,
              status TEXT DEFAULT 'available',
              machineId INTEGER,
              operatorId TEXT,
              assignedOperations TEXT,
              smv REAL DEFAULT 0,
              efficiency REAL DEFAULT 0,
              targetEfficiency REAL DEFAULT 85,
              createdBy TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log('Ensured tbl_IE_Workstations exists');

          // 5. Seed initial workstations if empty
          db.get("SELECT COUNT(*) as count FROM tbl_IE_Workstations", (err, row) => {
              if (row && row.count === 0) {
                  const sections = ['Cutting', 'Sewing', 'Finishing', 'Packing'];
                  sections.forEach(sec => {
                      for (let i = 1; i <= 5; i++) {
                          db.run(`
                            INSERT INTO tbl_IE_Workstations (workstationCode, workstationName, section, capacity, status, assignedOperations, createdBy)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                          `, [`${sec.toUpperCase().slice(0,3)}-WS-0${i}`, `${sec} Station ${i}`, sec, 200, 'available', '[]', 'system']);
                      }
                  });
                  console.log('Seeded default workstations');
              }
              db.close();
              resolve();
          });
      });
    });
  });
}

fixLineBalancingTables()
  .then(() => console.log('✅ Fix completed'))
  .catch(err => console.error('❌ Fix failed:', err));
