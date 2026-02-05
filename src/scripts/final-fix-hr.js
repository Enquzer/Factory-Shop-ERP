
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

async function fixHRUser() {
  const username = 'HR';
  const password = 'Hr123';
  const role = 'hr';
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    'INSERT OR REPLACE INTO users (id, username, password, role, created_at) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, ?, CURRENT_TIMESTAMP)',
    [username, username, hashedPassword, role],
    (err) => {
      if (err) console.error('Error fixing HR user:', err);
      else console.log(`User HR (Password: Hr123, Role: hr) is ready.`);
      db.close();
    }
  );
}

fixHRUser();
