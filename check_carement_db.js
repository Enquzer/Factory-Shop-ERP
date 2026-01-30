const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'carement.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Tables:', rows);
    }
  });
  
  db.all("SELECT username, role FROM users LIMIT 5", (err, rows) => {
    if (err) {
      console.error('Users error:', err.message);
    } else {
      console.log('Users:', rows);
    }
    db.close();
  });
});