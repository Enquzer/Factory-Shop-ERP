const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/carement.db');

const tables = ['drivers', 'driver_assignments', 'order_dispatches'];

const checkTable = (index) => {
  if (index >= tables.length) {
    db.close();
    return;
  }
  const table = tables[index];
  console.log(`\n--- ${table} table info ---`);
  db.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err) console.error(err);
    else {
      rows.forEach(r => console.log(`${table}: ${r.name} (${r.type})`));
    }
    checkTable(index + 1);
  });
};

checkTable(0);
