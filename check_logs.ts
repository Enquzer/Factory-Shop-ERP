import { getDb } from './src/lib/db';

async function checkLogs() {
  try {
    const db = await getDb();
    const logs = await db.all('SELECT * FROM shop_telegram_notifications ORDER BY created_at DESC LIMIT 10');
    console.log('--- TELEGRAM NOTIFICATION LOGS ---');
    console.log(JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLogs();
