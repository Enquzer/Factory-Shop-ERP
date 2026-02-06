import { getDb } from './src/lib/db';

async function checkDBStructure() {
  try {
    const db = await getDb();
    
    // Check all tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('=== ALL TABLES ===');
    tables.forEach((table: any) => {
      console.log('-', table.name);
    });
    
    // Check specific tables of interest
    console.log('\n=== ASSET/MACHINE RELATED TABLES ===');
    const assetTables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%asset%' OR name LIKE '%machine%' OR name LIKE '%equipment%')");
    assetTables.forEach((table: any) => {
      console.log('-', table.name);
    });
    
    console.log('\n=== SALES/ORDER/COSTING TABLES ===');
    const salesTables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%sales%' OR name LIKE '%order%' OR name LIKE '%costing%' OR name LIKE '%marketing_order%')");
    salesTables.forEach((table: any) => {
      console.log('-', table.name);
    });
    
    // Check operation_bulletins structure
    console.log('\n=== OPERATION_BULLETINS TABLE STRUCTURE ===');
    const obColumns = await db.all("PRAGMA table_info(operation_bulletins)");
    obColumns.forEach((col: any) => {
      console.log(`${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // Check employees structure
    console.log('\n=== EMPLOYEES TABLE STRUCTURE ===');
    const empColumns = await db.all("PRAGMA table_info(employees)");
    empColumns.forEach((col: any) => {
      console.log(`${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // Check if there are any existing IE related tables
    console.log('\n=== EXISTING IE RELATED TABLES ===');
    const ieTables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%ie%' OR name LIKE '%industrial%' OR name LIKE '%engineering%')");
    if (ieTables.length > 0) {
      ieTables.forEach((table: any) => {
        console.log('-', table.name);
      });
    } else {
      console.log('No existing IE tables found');
    }
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkDBStructure();