const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

const columns = [
  { name: 'cuttingStartDate', type: 'TEXT' },
  { name: 'cuttingFinishDate', type: 'TEXT' },
  { name: 'packingStartDate', type: 'TEXT' },
  { name: 'packingFinishDate', type: 'TEXT' },
  { name: 'isNewProduct', type: 'INTEGER DEFAULT 0' }
];

db.serialize(() => {
  columns.forEach(col => {
    const sql = `ALTER TABLE marketing_orders ADD COLUMN ${col.name} ${col.type}`;
    console.log(`Running: ${sql}`);
    db.run(sql, (err) => {
      if (err) {
        if (err.message.includes('duplicate column')) {
          console.log(`Column ${col.name} already exists.`);
        } else {
          console.error(`Error adding column ${col.name}:`, err.message);
        }
      } else {
        console.log(`Successfully added column ${col.name}`);
      }
    });
  });
});

db.close(() => console.log('Database connection closed.'));
