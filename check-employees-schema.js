const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/carement.db');

console.log('Employees table columns:');
db.each('PRAGMA table_info(employees)', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
  }
}, () => {
  db.close();
});