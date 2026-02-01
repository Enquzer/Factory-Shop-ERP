const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Add quantityRejected column if it doesn't exist
  db.run(`
    ALTER TABLE quality_inspections ADD COLUMN quantityRejected INTEGER DEFAULT 0
  `, (err) => {
    if (err) {
      // Column might already exist, which is fine
      if (err.message.includes('duplicate column')) {
        console.log('quantityRejected column already exists');
      } else {
        console.error('Error adding column:', err.message);
      }
    } else {
      console.log('quantityRejected column added successfully');
    }
  });
});

db.close();
