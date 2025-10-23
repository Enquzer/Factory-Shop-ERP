// Script to ensure all marketing orders have image URLs by looking up product images
// This script can be run periodically to fix any missing image URLs

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Get the database path
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
console.log('Database path:', dbPath);

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the database.');
  
  // Find marketing orders without image URLs
  db.all(`SELECT id, productCode FROM marketing_orders WHERE imageUrl IS NULL OR imageUrl = ''`, [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('All marketing orders have image URLs. No updates needed.');
      db.close();
      return;
    }
    
    console.log(`Found ${rows.length} orders without image URLs. Updating...`);
    
    // Process each order
    let processed = 0;
    const total = rows.length;
    
    rows.forEach((row) => {
      // Look up the product image URL
      db.get(`SELECT imageUrl FROM products WHERE productCode = ?`, [row.productCode], (err, product) => {
        if (err) {
          console.error(`Error looking up product ${row.productCode}:`, err.message);
        } else if (product && product.imageUrl) {
          // Update the marketing order with the product image URL
          db.run(`UPDATE marketing_orders SET imageUrl = ? WHERE id = ?`, [product.imageUrl, row.id], (err) => {
            if (err) {
              console.error(`Error updating order ${row.id}:`, err.message);
            } else {
              console.log(`✓ Updated order ${row.id} (${row.productCode}) with image URL: ${product.imageUrl}`);
            }
            processed++;
            if (processed === total) {
              console.log(`\nCompleted! Updated ${total} orders.`);
              db.close();
            }
          });
        } else {
          console.log(`⚠ No image found for product ${row.productCode}`);
          processed++;
          if (processed === total) {
            console.log(`\nCompleted! Processed ${total} orders.`);
            db.close();
          }
        }
      });
    });
  });
});