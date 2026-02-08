const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/carement.db');

console.log('Existing tracking numbers:');
db.each('SELECT tracking_number, order_id FROM order_dispatches ORDER BY created_at DESC LIMIT 10', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`${row.tracking_number} -> ${row.order_id}`);
  }
}, () => {
  db.close();
});