const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(process.cwd(), 'db', 'carement.db');

async function forceSeedWorkstations() {
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Force seeding workstations...');

      // 1. Double check tbl_IE_Workstations exists
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

      // 2. Clear existing (to ensure we have fresh ones for testing)
      // db.run("DELETE FROM tbl_IE_Workstations");
      
      // Actually, let's just insert if they don't exist by code
      const sections = ['Cutting', 'Sewing', 'Finishing', 'Packing'];
      let count = 0;
      const totalToInsert = sections.length * 10; // 10 per section

      sections.forEach(sec => {
        for (let i = 1; i <= 10; i++) {
          const code = `${sec.toUpperCase().slice(0,3)}-WS-${i.toString().padStart(2, '0')}`;
          const name = `${sec} Workstation ${i}`;
          
          db.run(`
            INSERT OR IGNORE INTO tbl_IE_Workstations 
            (workstationCode, workstationName, section, capacity, status, assignedOperations, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [code, name, sec, 200, 'available', '[]', 'system'], (err) => {
            count++;
            if (count === totalToInsert) {
              console.log('Finished seeding workstations');
              db.close();
              resolve();
            }
          });
        }
      });
    });
  });
}

forceSeedWorkstations()
  .then(() => console.log('✅ Success'))
  .catch(err => console.error('❌ Failed:', err));
