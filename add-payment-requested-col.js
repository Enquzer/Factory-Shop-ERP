
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run("ALTER TABLE orders ADD COLUMN paymentRequested BOOLEAN DEFAULT 0", (err) => {
    if (err) {
      if (err.message.includes("duplicate column name")) {
        console.log("Column already exists");
      } else {
        console.error("Error adding column:", err);
      }
    } else {
      console.log("Column added successfully");
    }
  });
});

db.close();
