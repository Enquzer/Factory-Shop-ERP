const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open the database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Query the shops table
db.serialize(() => {
  // Get the schema of the shops table
  db.each(`SELECT sql FROM sqlite_master WHERE type='table' AND name='shops'`, (err, row) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Shops table schema:');
      console.log(row.sql);
    }
  });
  
  // Get all shops
  db.each(`SELECT * FROM shops`, (err, row) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Shop record:');
      console.log(row);
    }
  });
});

// Close the database
db.close();