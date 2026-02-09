const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  const row = await db.get('SELECT * FROM driver_assignments LIMIT 1');
  console.log('Columns:', Object.keys(row).join(', '));
}

check();
