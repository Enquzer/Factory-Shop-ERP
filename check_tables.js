const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database schema...\n');

// Check material_requisitions table
db.serialize(() => {
  db.all("PRAGMA table_info(material_requisitions)", (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('=== material_requisitions table ===');
    console.log(rows);
    console.log('');
  });

  // Check orders table
  db.all("PRAGMA table_info(orders)", (err, rows) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('=== orders table ===');
    console.log(rows);
    console.log('');
  });
});

db.close();