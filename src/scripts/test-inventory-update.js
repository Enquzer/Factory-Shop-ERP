const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Test function to check inventory update
async function testInventoryUpdate() {
  try {
    // Get a sample marketing order that is completed
    const order = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, productCode, quantity 
        FROM marketing_orders 
        WHERE isCompleted = 1 
        LIMIT 1
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      console.log('No completed marketing orders found for testing');
      return;
    }

    console.log('Testing inventory update for order:', order);

    // Get the order items
    const orderItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT size, color, quantity 
        FROM marketing_order_items 
        WHERE orderId = ?
      `, [order.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('Order items:', orderItems);

    // Check factory inventory for each item
    for (const item of orderItems) {
      const variant = await new Promise((resolve, reject) => {
        db.get(`
          SELECT pv.id, pv.stock, p.name
          FROM product_variants pv
          JOIN products p ON pv.productId = p.id
          WHERE p.productCode = ? AND pv.size = ? AND pv.color = ?
        `, [order.productCode, item.size, item.color], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (variant) {
        console.log(`Variant ${variant.name} (${item.color}, ${item.size}): Stock = ${variant.stock}`);
      } else {
        console.log(`Variant not found for ${order.productCode}, ${item.color}, ${item.size}`);
      }
    }

    console.log('Inventory update test completed');
  } catch (error) {
    console.error('Error testing inventory update:', error);
  } finally {
    db.close();
  }
}

// Run the test
testInventoryUpdate();