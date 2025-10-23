const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

// Test function to complete an order and check inventory update
async function testCompleteOrder() {
  try {
    // Get a sample marketing order that is not yet completed
    const order = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, productCode, quantity 
        FROM marketing_orders 
        WHERE isCompleted = 0 
        LIMIT 1
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      console.log('No uncompleted marketing orders found for testing');
      return;
    }

    console.log('Testing completion for order:', order);

    // Get current stock for the product variants before completion
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

    console.log('Order items to be produced:', orderItems);

    // Record current stock levels
    const stockBefore = {};
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
        stockBefore[`${item.size}-${item.color}`] = {
          id: variant.id,
          name: variant.name,
          stock: variant.stock
        };
        console.log(`Before: ${variant.name} (${item.color}, ${item.size}) = ${variant.stock}`);
      }
    }

    // Mark the order as completed (simulating the API call)
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE marketing_orders 
        SET isCompleted = 1, status = 'Completed', completedDate = datetime('now')
        WHERE id = ?
      `, [order.id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    console.log('Order marked as completed');

    // Update factory inventory with produced quantities (simulating our new functionality)
    for (const item of orderItems) {
      const variant = await new Promise((resolve, reject) => {
        db.get(`
          SELECT pv.id, pv.stock
          FROM product_variants pv
          JOIN products p ON pv.productId = p.id
          WHERE p.productCode = ? AND pv.size = ? AND pv.color = ?
        `, [order.productCode, item.size, item.color], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (variant) {
        // Update the factory inventory by adding the produced quantity
        const newStock = variant.stock + item.quantity;
        await new Promise((resolve, reject) => {
          db.run(`
            UPDATE product_variants 
            SET stock = ? 
            WHERE id = ?
          `, [newStock, variant.id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          });
        });
        
        console.log(`Updated factory inventory for variant ${variant.id}: ${variant.stock} -> ${newStock}`);
      }
    }

    // Check stock levels after completion
    console.log('\nStock levels after completion:');
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
        const before = stockBefore[`${item.size}-${item.color}`];
        console.log(`After: ${variant.name} (${item.color}, ${item.size}) = ${variant.stock} (was ${before ? before.stock : 'unknown'})`);
      }
    }

    console.log('Order completion test completed successfully');
  } catch (error) {
    console.error('Error testing order completion:', error);
  } finally {
    db.close();
  }
}

// Run the test
testCompleteOrder();