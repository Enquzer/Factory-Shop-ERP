const { getDb } = require('./dist/lib/db.js');

async function checkDB() {
  try {
    const db = await getDb();
    
    // Check triggers
    const triggers = await db.all('SELECT name, sql FROM sqlite_master WHERE type="trigger"');
    console.log('Triggers:', triggers);
    
    // Check foreign keys for orders table
    const fks = await db.all('PRAGMA foreign_key_list(orders)');
    console.log('Foreign keys for orders:', fks);
    
    // Check if orderNumber column exists in orders table
    const orderColumns = await db.all('PRAGMA table_info(orders)');
    console.log('Orders table columns:', orderColumns.map(c => c.name));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDB();