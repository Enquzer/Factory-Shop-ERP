const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Test function to check if shop notifications are created when variant attributes are updated
async function testVariantUpdateNotification() {
  try {
    // Get a sample product variant
    const variant = await new Promise((resolve, reject) => {
      db.get(`
        SELECT pv.id as variantId, p.name as productName, pv.color, pv.size
        FROM product_variants pv
        JOIN products p ON pv.productId = p.id
        LIMIT 1
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!variant) {
      console.log('No product variants found for testing');
      return;
    }

    console.log('Testing notification for variant:', variant);

    // Get shops that have this variant in their inventory
    const shopsWithVariant = await new Promise((resolve, reject) => {
      db.all(`
        SELECT si.shopId, s.name as shopName
        FROM shop_inventory si 
        JOIN shops s ON si.shopId = s.id
        WHERE si.productVariantId = ?
      `, [variant.variantId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('Shops with this variant in inventory:', shopsWithVariant);

    // Check for existing notifications for variant updates
    const existingNotifications = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM notifications 
        WHERE title = 'Product Variant Updated' AND description LIKE ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [`%${variant.productName}%${variant.color}%${variant.size}%`], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('Recent product variant update notifications:', existingNotifications);

    console.log('Variant update notification test completed');
  } catch (error) {
    console.error('Error testing variant update notification:', error);
  } finally {
    db.close();
  }
}

// Run the test
testVariantUpdateNotification();