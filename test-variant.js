const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Check if variant VAR-1 exists
db.get(`SELECT stock, productId FROM product_variants WHERE id = ?`, ['VAR-1'], (err, row) => {
  if (err) {
    console.error('Error querying database:', err);
    return;
  }
  
  if (row) {
    console.log('Variant VAR-1 found:');
    console.log('Stock:', row.stock);
    console.log('Product ID:', row.productId);
    
    // Also check the product details
    db.get(`SELECT name FROM products WHERE id = ?`, [row.productId], (err, product) => {
      if (err) {
        console.error('Error querying product:', err);
        return;
      }
      
      if (product) {
        console.log('Product name:', product.name);
      } else {
        console.log('Product not found for this variant');
      }
      
      db.close();
    });
  } else {
    console.log('Variant VAR-1 not found in database');
    
    // Let's see what variants do exist
    db.all(`SELECT id, productId, stock FROM product_variants LIMIT 10`, (err, rows) => {
      if (err) {
        console.error('Error querying variants:', err);
        return;
      }
      
      console.log('Existing variants (first 10):');
      rows.forEach(row => {
        console.log(`ID: ${row.id}, Product ID: ${row.productId}, Stock: ${row.stock}`);
      });
      
      db.close();
    });
  }
});