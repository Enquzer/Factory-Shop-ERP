import { getDb } from './src/lib/db';

async function checkShops() {
  try {
    const db = await getDb();
    const shops = await db.all('SELECT id, name, username, telegram_channel_id FROM shops');
    console.log('--- SHOPS ---');
    console.log(JSON.stringify(shops, null, 2));
    
    const orders = await db.all('SELECT id, shopId, status FROM orders ORDER BY created_at DESC LIMIT 5');
    console.log('\n--- RECENT ORDERS ---');
    console.log(JSON.stringify(orders, null, 2));

    const logs = await db.all('SELECT * FROM shop_telegram_notifications ORDER BY created_at DESC LIMIT 10');
    console.log('\n--- TELEGRAM LOGS ---');
    console.log(JSON.stringify(logs, null, 2));
    
    console.log('\n--- ENV ---');
    console.log('TELEGRAM_ENABLED:', process.env.TELEGRAM_ENABLED);
    console.log('TELEGRAM_BOT_TOKEN set:', !!process.env.TELEGRAM_BOT_TOKEN);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkShops();
