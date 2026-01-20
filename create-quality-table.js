const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS quality_inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId TEXT NOT NULL,
      date TEXT NOT NULL,
      stage TEXT NOT NULL,
      size TEXT,
      color TEXT,
      quantityInspected INTEGER,
      quantityPassed INTEGER,
      status TEXT,
      reportUrl TEXT,
      remarks TEXT,
      inspectorId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Quality inspections table created successfully');
    }
  });
});

db.close();
