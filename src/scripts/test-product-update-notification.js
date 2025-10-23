const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Test function to check if shop notifications are created when product attributes are updated
async function testProductUpdateNotification() {
  try {
    // Get a sample product
    const product = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, name, productCode
        FROM products
        LIMIT 1
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!product) {
      console.log('No products found for testing');
      return;
    }

    console.log('Testing notification for product:', product);

    // Get shops that have this product in their inventory
    const shopsWithProduct = await new Promise((resolve, reject) => {
      db.all(`
        SELECT DISTINCT si.shopId, s.name as shopName
        FROM shop_inventory si 
        JOIN product_variants pv ON si.productVariantId = pv.id 
        JOIN shops s ON si.shopId = s.id
        WHERE pv.productId = ?
      `, [product.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('Shops with this product in inventory:', shopsWithProduct);

    // Check for existing notifications for product updates
    const existingNotifications = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM notifications 
        WHERE title = 'Product Updated' AND description LIKE ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [`%${product.name}%`], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('Recent product update notifications:', existingNotifications);

    console.log('Product update notification test completed');
  } catch (error) {
    console.error('Error testing product update notification:', error);
  } finally {
    db.close();
  }
}

// Run the test
testProductUpdateNotification();