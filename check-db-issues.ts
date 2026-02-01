import { getDb } from './src/lib/db';

async function checkTriggers() {
  try {
    const db = await getDb();
    const triggers = await db.all('SELECT name, sql FROM sqlite_master WHERE type="trigger"');
    console.log('Triggers found:', triggers);
    
    // Also check for views that might reference orderNumber
    const views = await db.all('SELECT name, sql FROM sqlite_master WHERE type="view"');
    console.log('Views found:', views);
    
    // Check if orderNumber column exists in orders table
    const orderColumns = await db.all('PRAGMA table_info(orders)');
    console.log('Orders table columns:', orderColumns.map((c: any) => c.name));
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkTriggers();