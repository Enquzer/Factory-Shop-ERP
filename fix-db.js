const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fix() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Connecting to database at:', dbPath);
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    console.log('Adding componentName to daily_production_status...');
    await db.exec('ALTER TABLE daily_production_status ADD COLUMN componentName TEXT');
    console.log('Success!');
  } catch (e) {
    console.log('Column might already exist:', e.message);
  }

  process.exit(0);
}

fix();
