const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Updating quality_inspections table with professional matrix fields...');

db.serialize(() => {
  const columnsToAdd = [
    { name: 'sampleSize', type: 'INTEGER DEFAULT 0' },
    { name: 'totalCritical', type: 'INTEGER DEFAULT 0' },
    { name: 'totalMajor', type: 'INTEGER DEFAULT 0' },
    { name: 'totalMinor', type: 'INTEGER DEFAULT 0' },
    { name: 'defectJson', type: 'TEXT' }
  ];

  columnsToAdd.forEach(col => {
    db.run(`ALTER TABLE quality_inspections ADD COLUMN ${col.name} ${col.type}`, (err) => {
      if (err) {
        if (err.message.includes('duplicate column')) {
          console.log(`Column ${col.name} already exists`);
        } else {
          console.error(`Error adding column ${col.name}:`, err.message);
        }
      } else {
        console.log(`Column ${col.name} added successfully`);
      }
    });
  });
});

db.close();
