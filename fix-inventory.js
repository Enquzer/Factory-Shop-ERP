const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking for inconsistent shop inventory items...');

// Find shop inventory items that reference non-existent product variants
db.all(`
  SELECT si.id, si.shopId, si.productId, si.productVariantId, si.name
  FROM shop_inventory si
  LEFT JOIN product_variants pv ON si.productVariantId = pv.id
  WHERE pv.id IS NULL
`, (err, rows) => {
  if (err) {
    console.error('Error querying database:', err);
    return;
  }
  
  if (rows.length > 0) {
    console.log(`Found ${rows.length} inconsistent shop inventory items:`);
    rows.forEach(row => {
      console.log(`  ID: ${row.id}, Shop: ${row.shopId}, Product: ${row.productId}, Variant: ${row.productVariantId}, Name: ${row.name}`);
    });
    
    // Ask for confirmation before deleting
    console.log('\nThese items reference non-existent product variants and should be removed.');
    console.log('Deleting these items...');
    
    // Delete the inconsistent items
    const ids = rows.map(row => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM shop_inventory WHERE id IN (${placeholders})`;
    
    db.run(query, ids, function(err) {
      if (err) {
        console.error('Error deleting items:', err);
      } else {
        console.log(`Successfully deleted ${this.changes} inconsistent shop inventory items.`);
      }
      
      db.close();
    });
  } else {
    console.log('No inconsistent shop inventory items found.');
    db.close();
  }
});