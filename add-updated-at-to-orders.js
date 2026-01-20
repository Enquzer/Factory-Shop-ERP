
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
    if (err) {
      if (err.message.includes("duplicate column name")) {
        console.log("updated_at column already exists");
      } else {
        console.error("Error adding updated_at column:", err);
      }
    } else {
      console.log("updated_at column added successfully");
    }
  });
});

db.close();
