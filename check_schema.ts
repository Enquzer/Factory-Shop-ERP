import { getDb } from './src/lib/db';

async function checkSchema() {
  try {
    const db = await getDb();
    const columns = await db.all("PRAGMA table_info(orders)");
    console.log('Orders Columns:');
    console.log(JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();
