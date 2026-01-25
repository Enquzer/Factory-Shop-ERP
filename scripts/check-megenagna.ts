
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkData() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Opening database at:', dbPath);

  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err: any) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
  });

  const query = (sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err: any, rows: any) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  try {
    console.log('\n--- Checking Users table for "Megenagna" ---');
    const users = await query("SELECT id, username, role, resetRequestPending, tempPasswordDisplay FROM users WHERE username LIKE '%megenagna%'");
    console.log('Users found:', users);

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    db.close();
  }
}

checkData();
