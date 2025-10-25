const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', '..', 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

async function testVariantUpdate() {
  try {
    // Create a test product if it doesn't exist
    const testProductCode = 'TEST-PRODUCT-001';
    let product = await new Promise((resolve, reject) => {
      db.get(`
        SELECT id, productCode, name FROM products WHERE productCode = ?
      `, [testProductCode], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!product) {
      console.log('Creating test product...');
      const productId = `PRD-${Date.now()}`;
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO products (id, productCode, name, category, price, minimumStockLevel, readyToDeliver)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [productId, testProductCode, 'Test Product', 'Unisex', 1000, 10, 1], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      
      product = { id: productId, productCode: testProductCode, name: 'Test Product' };
      console.log('Test product created:', product);
    } else {
      console.log('Using existing test product:', product);
    }
    
    // Create a test marketing order
    const orderId = `MKT-ORD-${Date.now()}`;
    const orderNumber = `CM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
    
    console.log('Creating test marketing order...');
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO marketing_orders (
          id, orderNumber, productName, productCode, quantity, status, isCompleted, createdBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [orderId, orderNumber, 'Test Product', testProductCode, 100, 'Completed', 1, 'Test Script'], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
    
    // Create test order items with existing and new variants
    console.log('Creating test order items...');
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO marketing_order_items (orderId, size, color, quantity)
        VALUES (?, ?, ?, ?)
      `, [orderId, 'M', 'Red', 50], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO marketing_order_items (orderId, size, color, quantity)
        VALUES (?, ?, ?, ?)
      `, [orderId, 'L', 'Blue', 30], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
    
    // This variant doesn't exist yet, should be created
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO marketing_order_items (orderId, size, color, quantity)
        VALUES (?, ?, ?, ?)
      `, [orderId, 'XL', 'Green', 20], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
    
    console.log('Test data created successfully');
    
    // Simulate the completion process
    console.log('Simulating marketing order completion...');
    
    // Get the order items
    const orderItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT size, color, quantity FROM marketing_order_items WHERE orderId = ?
      `, [orderId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Order items:', orderItems);
    
    // Process each item
    for (const item of orderItems) {
      // Find the corresponding product variant
      const variant = await new Promise((resolve, reject) => {
        db.get(`
          SELECT pv.id, pv.stock
          FROM product_variants pv
          JOIN products p ON pv.productId = p.id
          WHERE p.productCode = ? AND pv.size = ? AND pv.color = ?
        `, [testProductCode, item.size, item.color], (err, row) => {
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
        
        console.log(`Updated existing variant ${variant.id}: ${variant.stock} -> ${newStock}`);
      } else {
        // Variant doesn't exist, create a new one
        console.log(`Variant not found for size ${item.size}, color ${item.color}. Creating new variant.`);
        
        // Generate a new variant ID
        const newVariantId = `VAR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Insert the new variant
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO product_variants (id, productId, color, size, stock)
            VALUES (?, ?, ?, ?, ?)
          `, [newVariantId, product.id, item.color, item.size, item.quantity], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
        
        console.log(`Created new variant ${newVariantId} with stock ${item.quantity}`);
      }
    }
    
    // Verify the results
    console.log('Verifying results...');
    const variants = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, color, size, stock FROM product_variants WHERE productId = ?
      `, [product.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Product variants after update:');
    variants.forEach(variant => {
      console.log(`  ${variant.color} ${variant.size}: ${variant.stock} units`);
    });
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    db.close();
  }
}

// Run the test
testVariantUpdate();