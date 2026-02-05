const { dbUtils } = require('./dist/lib/db'); // Wait, dist might not exist or we are using ts-node/next.
// Better test using a script that can resolve the same path.
// But wait, the app is running in Next.js environment.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.get('SELECT value FROM system_settings WHERE key = "test"', (err, row) => {
  if (err) {
    console.error('Table access failed:', err.message);
  } else {
    console.log('Table access success, value:', row ? row.value : 'null');
  }
  db.close();
});
