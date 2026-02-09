const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  const orderId = 'ECOM-1770620805305';
  const order = await db.get("SELECT status FROM ecommerce_orders WHERE id = ?", [orderId]);
  console.log('STATUS:', order.status);
}

check();
