
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkShopSettings() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    console.log('\n--- Checking Megenagna Shop Settings ---');
    const shops = await query("SELECT id, username, name, show_variant_details FROM shops WHERE username LIKE '%megenagna%'");
    console.log('Shops found:', JSON.stringify(shops, null, 2));

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    db.close();
  }
}

checkShopSettings();
