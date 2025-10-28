const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Check if any variants contain "VAR-1"
db.all(`SELECT id, productId, stock FROM product_variants WHERE id LIKE '%VAR-1%'`, (err, rows) => {
  if (err) {
    console.error('Error querying database:', err);
    return;
  }
  
  if (rows.length > 0) {
    console.log('Variants containing "VAR-1":');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Product ID: ${row.productId}, Stock: ${row.stock}`);
    });
  } else {
    console.log('No variants found containing "VAR-1"');
  }
  
  // Check if any shop inventory items reference VAR-1
  db.all(`SELECT * FROM shop_inventory WHERE productVariantId LIKE '%VAR-1%'`, (err, rows) => {
    if (err) {
      console.error('Error querying shop inventory:', err);
      return;
    }
    
    if (rows.length > 0) {
      console.log('Shop inventory items referencing "VAR-1":');
      rows.forEach(row => {
        console.log(row);
      });
    } else {
      console.log('No shop inventory items found referencing "VAR-1"');
    }
    
    db.close();
  });
});