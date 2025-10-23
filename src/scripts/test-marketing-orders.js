// Detailed test script to check marketing orders data and image URLs
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get the database path
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
console.log('Database path:', dbPath);

// Open database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the database.');
  
  // Query marketing orders with detailed information
  db.all(`SELECT * FROM marketing_orders ORDER BY createdAt DESC`, [], (err, rows) => {
    if (err) {
      console.error('Error querying database:', err.message);
      return;
    }
    
    console.log(`Found ${rows.length} orders`);
    
    // Log details of each order
    rows.forEach((row, index) => {
      console.log(`\n--- Order ${index + 1} ---`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Order Number: ${row.orderNumber}`);
      console.log(`  Product Name: ${row.productName}`);
      console.log(`  Product Code: ${row.productCode}`);
      console.log(`  Image URL: ${row.imageUrl || 'NULL'}`);
      
      if (row.imageUrl) {
        // Check if the image file exists
        const imagePath = path.join(__dirname, '..', '..', 'public', row.imageUrl.replace(/^\//, ''));
        const fileExists = fs.existsSync(imagePath);
        console.log(`  Image File Exists: ${fileExists ? 'YES' : 'NO'}`);
        if (!fileExists) {
          console.log(`  Expected file path: ${imagePath}`);
        }
      }
      
      console.log(`  Quantity: ${row.quantity}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Created At: ${row.createdAt}`);
    });
    
    // Close database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\nDatabase connection closed.');
      }
    });
  });
});