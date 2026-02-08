const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/carement.db');

console.log('Notifications table columns:');
db.each('PRAGMA table_info(notifications)', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`${row.cid}: ${row.name} (${row.type})`);
  }
}, () => {
  db.close();
});