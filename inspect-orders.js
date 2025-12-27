const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Query to check if there are any orders
db.all('SELECT * FROM orders', (err, rows) => {
  if (err) {
    console.error('Error querying orders:', err);
    return;
  }
  
  console.log('Orders in database:', rows);
  console.log('Total orders:', rows.length);
  
  // Also check products
  db.all('SELECT * FROM products', (err, productRows) => {
    if (err) {
      console.error('Error querying products:', err);
      return;
    }
    
    console.log('Products in database:', productRows);
    console.log('Total products:', productRows.length);
    
    // Also check shops
    db.all('SELECT * FROM shops', (err, shopRows) => {
      if (err) {
        console.error('Error querying shops:', err);
        return;
      }
      
      console.log('Shops in database:', shopRows);
      console.log('Total shops:', shopRows.length);
      
      db.close();
    });
  });
});