
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function setupDriversTable() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Opening database at:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    console.log('Creating drivers table...');
    await db.exec(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        license_plate TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Drivers table created successfully.');

    // Check if there's a comment column in orders or dispatchInfo handle it
    // The existing dispatch API saves dispatchInfo as a JSON string in orders table.
    // Let's check if the column exists in orders table.
    const tableInfo = await db.all("PRAGMA table_info(orders)");
    const hasDispatchInfo = tableInfo.some(col => col.name === 'dispatchInfo');
    
    if (!hasDispatchInfo) {
      console.log('Adding dispatchInfo column to orders table...');
      await db.exec("ALTER TABLE orders ADD COLUMN dispatchInfo TEXT");
    } else {
      console.log('dispatchInfo column already exists in orders table.');
    }

  } catch (error) {
    console.error('Error setting up drivers table:', error);
  } finally {
    await db.close();
  }
}

setupDriversTable();
