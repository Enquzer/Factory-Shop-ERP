const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/carement.db');

db.all("PRAGMA table_info(drivers)", (err, rows) => {
  const updatedAt = rows.find(r => r.name === 'updatedAt');
  console.log('updatedAt status:', updatedAt ? 'EXISTS' : 'MISSING');
  
  db.all("PRAGMA table_info(driver_assignments)", (err, rows2) => {
    const orderId = rows2.find(r => r.name === 'orderId');
    console.log('orderId status:', orderId ? 'EXISTS' : 'MISSING');
    db.close();
  });
});
