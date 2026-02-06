import { getDb } from './src/lib/db';

async function checkIETables() {
  try {
    const db = await getDb();
    
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%IE%'
    `);
    
    console.log('IE tables:', tables);
    
    // Check if there's a machines table with different naming
    const allTables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table'
    `);
    
    const machineTables = allTables.filter((table: any) => 
      table.name.toLowerCase().includes('machine')
    );
    
    console.log('Machine-related tables:', machineTables);
    
    await db.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkIETables();