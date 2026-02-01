const { getDb } = require('./src/lib/db');

async function checkTables() {
  try {
    const db = await getDb();
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in database:');
    tables.forEach(table => {
      console.log('-', table.name);
    });
    
    // Check if pos_sales table exists
    const posTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='pos_sales'");
    console.log('\npos_sales table exists:', !!posTable);
    
    if (posTable) {
      // Check table structure
      const columns = await db.all("PRAGMA table_info(pos_sales)");
      console.log('\npos_sales columns:');
      columns.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
    }
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkTables();