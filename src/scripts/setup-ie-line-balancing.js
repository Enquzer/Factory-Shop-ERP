const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', '..', 'carement.db');

async function createLineBalancingTables() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        reject(err);
        return;
      }
      console.log('✅ Connected to database');
    });

    // Create Workstations table
    db.serialize(() => {
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
          assignedOperations TEXT, -- JSON array of operation codes
          smv REAL DEFAULT 0, -- Standard Minute Value
          efficiency REAL DEFAULT 0, -- Current efficiency percentage
          targetEfficiency REAL DEFAULT 85, -- Target efficiency
          createdBy TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (machineId) REFERENCES tbl_IE_Machines (id),
          FOREIGN KEY (operatorId) REFERENCES employees (employeeId)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating workstations table:', err);
          reject(err);
        } else {
          console.log('✅ tbl_IE_Workstations table created');
        }
      });

      // Create Line Balance table
      db.run(`
        CREATE TABLE IF NOT EXISTS tbl_IE_Line_Balance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          orderId TEXT NOT NULL,
          productCode TEXT NOT NULL,
          lineName TEXT NOT NULL,
          section TEXT NOT NULL,
          targetOutput INTEGER NOT NULL, -- units per hour
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
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (bottleneckWorkstationId) REFERENCES tbl_IE_Workstations (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating line balance table:', err);
          reject(err);
        } else {
          console.log('✅ tbl_IE_Line_Balance table created');
        }
      });

      // Create Operation Assignments table
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
          FOREIGN KEY (workstationId) REFERENCES tbl_IE_Workstations (id),
          FOREIGN KEY (assignedOperator) REFERENCES employees (employeeId)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating operation assignments table:', err);
          reject(err);
        } else {
          console.log('✅ tbl_IE_Operation_Assignments table created');
        }
      });

      // Create indexes
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_workstations_section ON tbl_IE_Workstations (section);
        CREATE INDEX IF NOT EXISTS idx_workstations_status ON tbl_IE_Workstations (status);
        CREATE INDEX IF NOT EXISTS idx_line_balance_order ON tbl_IE_Line_Balance (orderId);
        CREATE INDEX IF NOT EXISTS idx_line_balance_section ON tbl_IE_Line_Balance (section);
        CREATE INDEX IF NOT EXISTS idx_assignments_line ON tbl_IE_Operation_Assignments (lineBalanceId);
        CREATE INDEX IF NOT EXISTS idx_assignments_workstation ON tbl_IE_Operation_Assignments (workstationId);
        CREATE INDEX IF NOT EXISTS idx_assignments_status ON tbl_IE_Operation_Assignments (status);
      `, (err) => {
        if (err) {
          console.error('❌ Error creating indexes:', err);
          reject(err);
        } else {
          console.log('✅ Indexes created');
        }
      });

      // Seed initial workstations
      seedWorkstations(db)
        .then(() => {
          console.log('✅ Line balancing database setup completed successfully!');
          db.close();
          resolve();
        })
        .catch((error) => {
          console.error('❌ Error seeding workstations:', error);
          db.close();
          reject(error);
        });
    });
  });
}

function seedWorkstations(db) {
  return new Promise((resolve, reject) => {
    // Check if workstations already exist
    db.get('SELECT COUNT(*) as count FROM tbl_IE_Workstations', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count > 0) {
        console.log(' Workstations already seeded, skipping...');
        resolve();
        return;
      }

      const workstations = [
        // Cutting Section Workstations
        {
          workstationCode: 'CUT-WS-01',
          workstationName: 'Cutting Station 1',
          section: 'Cutting',
          capacity: 120,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'CUT-WS-02',
          workstationName: 'Cutting Station 2',
          section: 'Cutting',
          capacity: 120,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'CUT-WS-03',
          workstationName: 'Cutting Station 3',
          section: 'Cutting',
          capacity: 120,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },

        // Sewing Section Workstations
        {
          workstationCode: 'SEW-WS-01',
          workstationName: 'Sewing Station 1',
          section: 'Sewing',
          capacity: 200,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'SEW-WS-02',
          workstationName: 'Sewing Station 2',
          section: 'Sewing',
          capacity: 200,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'SEW-WS-03',
          workstationName: 'Sewing Station 3',
          section: 'Sewing',
          capacity: 200,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'SEW-WS-04',
          workstationName: 'Sewing Station 4',
          section: 'Sewing',
          capacity: 200,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'SEW-WS-05',
          workstationName: 'Sewing Station 5',
          section: 'Sewing',
          capacity: 200,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },

        // Finishing Section Workstations
        {
          workstationCode: 'FIN-WS-01',
          workstationName: 'Finishing Station 1',
          section: 'Finishing',
          capacity: 150,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'FIN-WS-02',
          workstationName: 'Finishing Station 2',
          section: 'Finishing',
          capacity: 150,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'FIN-WS-03',
          workstationName: 'Finishing Station 3',
          section: 'Finishing',
          capacity: 150,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },

        // Packing Section Workstations
        {
          workstationCode: 'PKG-WS-01',
          workstationName: 'Packing Station 1',
          section: 'Packing',
          capacity: 180,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        },
        {
          workstationCode: 'PKG-WS-02',
          workstationName: 'Packing Station 2',
          section: 'Packing',
          capacity: 180,
          status: 'available',
          smv: 0,
          efficiency: 0,
          targetEfficiency: 85
        }
      ];

      let inserted = 0;
      workstations.forEach((ws) => {
        db.run(
          `INSERT INTO tbl_IE_Workstations 
           (workstationCode, workstationName, section, capacity, status, 
            assignedOperations, smv, efficiency, targetEfficiency, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ws.workstationCode,
            ws.workstationName,
            ws.section,
            ws.capacity,
            ws.status,
            JSON.stringify([]),
            ws.smv,
            ws.efficiency,
            ws.targetEfficiency,
            'system'
          ],
          (err) => {
            if (err) {
              console.error('❌ Error inserting workstation:', ws.workstationCode, err);
            } else {
              inserted++;
              if (inserted === workstations.length) {
                console.log('✅ Sample workstations seeded successfully');
                resolve();
              }
            }
          }
        );
      });
    });
  });
}

// Run the setup
createLineBalancingTables()
  .then(() => {
    console.log('✅ Line balancing database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Line balancing database setup failed:', error);
    process.exit(1);
  });