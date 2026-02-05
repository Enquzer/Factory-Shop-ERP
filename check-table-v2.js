const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.get('SELECT name FROM sqlite_master WHERE type="table" AND name="system_settings"', (err, row) => {
  if (err) {
    console.error('Master check failed:', err.message);
  } else if (row) {
    console.log('Table "system_settings" FOUND in database.');
    db.get('SELECT COUNT(*) as count FROM system_settings', (err, row) => {
        if (err) console.error('Count check failed:', err.message);
        else console.log('Current row count in system_settings:', row.count);
        db.close();
    });
  } else {
    console.log('Table "system_settings" NOT FOUND.');
    db.close();
  }
});
