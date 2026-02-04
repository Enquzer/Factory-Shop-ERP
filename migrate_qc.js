
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Adding columns to products table...');
  
  try {
    await db.exec("ALTER TABLE products ADD COLUMN sampleSizeSetQCStatus TEXT DEFAULT 'Pending';");
    console.log('Added sampleSizeSetQCStatus');
  } catch (e) {
    console.log('sampleSizeSetQCStatus might already exist or error:', e.message);
  }

  try {
    await db.exec("ALTER TABLE products ADD COLUMN sampleCounterQCStatus TEXT DEFAULT 'Pending';");
    console.log('Added sampleCounterQCStatus');
  } catch (e) {
    console.log('sampleCounterQCStatus might already exist or error:', e.message);
  }

  await db.close();
  console.log('Migration completed.');
}

migrate().catch(console.error);
