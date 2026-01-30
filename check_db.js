const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Tables:', rows);
    }
  });
  
  db.all("SELECT * FROM users LIMIT 3", (err, rows) => {
    if (err) {
      console.error('Users table error:', err.message);
    } else {
      console.log('Users:', rows);
    }
    db.close();
  });
});