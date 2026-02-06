// Simple script to check machine table structure
// Run with: npx tsx check_machine_table.js

import { getDb } from './src/lib/db';

async function checkMachineTable() {
  try {
    const db = await getDb();
    
    // Check all tables
    const allTables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table'
      ORDER BY name
    `);
    
    console.log('All tables in database:');
    allTables.forEach(table => {
      console.log(`- ${table.name}`);
    });
    
    await db.close();
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkMachineTable();