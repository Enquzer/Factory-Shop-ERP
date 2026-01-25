import { getDb } from './src/lib/db';

async function checkPlacedOrders() {
  try {
    const db = await getDb();
    const logs = await db.all("SELECT * FROM shop_telegram_notifications WHERE messageType = 'order_placed' ORDER BY created_at DESC LIMIT 5");
    console.log('--- RECENT PLACEMENT LOGS ---');
    console.log(JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPlacedOrders();
