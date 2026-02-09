const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%order%'", (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
  });
});
