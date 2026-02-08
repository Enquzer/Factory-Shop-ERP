const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/carement.db');

console.log('Driver Assignments table columns:');
db.each('PRAGMA table_info(driver_assignments)', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`${row.cid}: ${row.name} (${row.type}) - NOT NULL: ${row.notnull ? 'YES' : 'NO'}`);
  }
}, () => {
  db.close();
});