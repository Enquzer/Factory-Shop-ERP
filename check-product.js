const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Check if product PROD-1 exists
db.get(`SELECT * FROM products WHERE id = ?`, ['PROD-1'], (err, row) => {
  if (err) {
    console.error('Error querying product:', err);
    return;
  }
  
  if (row) {
    console.log('Product PROD-1 found:');
    console.log(row);
  } else {
    console.log('Product PROD-1 not found');
    
    // Check if any products have ID starting with PROD-1
    db.all(`SELECT id, name FROM products WHERE id LIKE 'PROD-1%'`, (err, rows) => {
      if (err) {
        console.error('Error querying products:', err);
        return;
      }
      
      if (rows.length > 0) {
        console.log('Products with ID starting with "PROD-1":');
        rows.forEach(row => {
          console.log(`ID: ${row.id}, Name: ${row.name}`);
        });
      } else {
        console.log('No products found with ID starting with "PROD-1"');
      }
      
      db.close();
    });
  }
});