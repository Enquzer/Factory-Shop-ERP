const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('=== DATABASE TABLE CHECK ===\n');

// Check assignment-related tables
db.serialize(() => {
  db.each("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%assign%'", (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Assignment table found:', row.name);
    }
  });

  db.each("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%dispatch%'", (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Dispatch table found:', row.name);
    }
  });

  // Check driver assignments
  db.get("SELECT COUNT(*) as count FROM driver_assignments", (err, row) => {
    if (err) {
      console.error('Error counting driver_assignments:', err);
    } else {
      console.log(`\nTotal driver assignments: ${row.count}`);
    }
  });

  // Check order_dispatches
  db.get("SELECT COUNT(*) as count FROM order_dispatches", (err, row) => {
    if (err) {
      console.error('Error counting order_dispatches:', err);
    } else {
      console.log(`Total order dispatches: ${row.count}`);
    }
    
    // Check assignments for Motor1
    db.all("SELECT * FROM driver_assignments WHERE driver_id = 'Motor1'", (err, rows) => {
      if (err) {
        console.error('Error getting Motor1 assignments:', err);
      } else {
        console.log(`\nMotor1 assignments (${rows.length}):`);
        rows.forEach(row => {
          console.log(`  Order: ${row.order_id}, Status: ${row.status}`);
        });
      }
      
      db.close();
    });
  });
});