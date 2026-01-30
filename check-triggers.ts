import { getDB } from './src/lib/db';

async function checkTriggers() {
  try {
    const db = await getDB();
    
    // Check for triggers
    const triggers = await db.all('SELECT name, tbl_name, sql FROM sqlite_master WHERE type = "trigger"');
    console.log('Triggers:');
    console.log(triggers);
    
    // Check for foreign key constraints
    const foreignKeys = await db.all('SELECT * FROM sqlite_master WHERE sql LIKE "%FOREIGN KEY%"');
    console.log('Foreign key constraints:');
    console.log(foreignKeys);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTriggers();