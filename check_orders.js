const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT id, orderNumber, status, latitude, longitude FROM ecommerce_orders LIMIT 10", (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log("ORDERS IN DB:");
      console.log(JSON.stringify(rows, null, 2));
    }
    
    db.all("SELECT DISTINCT status FROM ecommerce_orders", (err, statuses) => {
        if (!err) {
            console.log("DISTINCT STATUSES:");
            console.log(JSON.stringify(statuses, null, 2));
        }
        db.close();
    });
  });
});
