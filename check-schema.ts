import { getDB } from './src/lib/db';

async function checkSchema() {
  try {
    const db = await getDB();
    
    // Check orders table schema
    const ordersInfo = await db.all('PRAGMA table_info(orders)');
    console.log('Orders table schema:');
    console.log(ordersInfo);
    
    // Check if orderNumber column exists
    const hasOrderNumber = ordersInfo.some((col: any) => col.name === 'orderNumber');
    console.log('Has orderNumber column:', hasOrderNumber);
    
    // Try to query the orders table
    try {
      const sampleOrders = await db.all('SELECT * FROM orders LIMIT 1');
      console.log('Sample orders:', sampleOrders);
    } catch (e: any) {
      console.log('Error querying orders:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();