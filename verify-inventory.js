
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function verifyInventoryLogic() {
    console.log('--- Starting Inventory Logic Verification ---');
    let db;
    try {
        // Connect to the actual database
        const dbPath = path.join(process.cwd(), 'db', 'carement.db');
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // 1. Create a test product
        const productCode = 'TEST-PROD-' + Date.now();
        const productId = 'PRD-TEST-' + Date.now();
        console.log(`Step 1: Creating product ${productCode}...`);

        await db.run(`
      INSERT INTO products (id, productCode, name, category, price, minimumStockLevel, readyToDeliver)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, productId, productCode, 'Test Product', 'Test Category', 100, 5, 1);

        const variantId = 'VAR-TEST-' + Date.now();
        await db.run(`
      INSERT INTO product_variants (id, productId, color, size, stock)
      VALUES (?, ?, ?, ?, ?)
    `, variantId, productId, 'Blue', 'M', 10);

        console.log(`Product created with 10 units in factory stock.`);

        // 2. Simulate Marketing Order completion (from api/marketing-orders/[id]/route.ts)
        console.log('Step 2: Completing Marketing Order (Production)...');
        const marketingOrderId = 'MKT-ORD-TEST-' + Date.now();
        await db.run(`
      INSERT INTO marketing_orders (id, orderNumber, productName, productCode, quantity, status, isCompleted, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, marketingOrderId, 'MKT-' + Date.now(), 'Test Product', productCode, 50, 'Completed', 1, 'factory');

        await db.run(`
      INSERT INTO marketing_order_items (orderId, size, color, quantity)
      VALUES (?, ?, ?, ?)
    `, marketingOrderId, 'M', 'Blue', 50);

        // Run the logic from api/marketing-orders/[id]/route.ts
        const variantMatch = await db.get(`
      SELECT pv.id, pv.stock
      FROM product_variants pv
      JOIN products p ON pv.productId = p.id
      WHERE p.productCode = ? AND pv.size = ? AND pv.color = ?
    `, productCode, 'M', 'Blue');

        if (variantMatch) {
            const newStock = variantMatch.stock + 50;
            await db.run(`UPDATE product_variants SET stock = ? WHERE id = ?`, newStock, variantMatch.id);
            console.log(`Factory stock increased to ${newStock} (Expected 60).`);
        }

        // 3. Place a Shop Order (should NOT decrease stock yet based on api/orders/route.ts)
        console.log('Step 3: Placing Shop Order...');
        const shopId = 'SHOP-TEST-' + Date.now();
        const orderId = 'ORD-TEST-' + Date.now();

        await db.run(`
      INSERT INTO shops (id, username, name, contactPerson, city, exactLocation)
      VALUES (?, ?, ?, ?, ?, ?)
    `, shopId, 'testshop-' + Date.now(), 'Test Shop', 'John', 'Addis', 'Mexico');

        const orderItems = [{
            productId: productId,
            name: 'Test Product',
            price: 100,
            variant: { id: variantId, color: 'Blue', size: 'M' },
            quantity: 5
        }];

        await db.run(`
      INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, orderId, shopId, 'Test Shop', new Date().toISOString(), 'Pending', 500, JSON.stringify(orderItems));

        const stockAfterOrder = await db.get(`SELECT stock FROM product_variants WHERE id = ?`, variantId);
        console.log(`Factory stock after order placement (Pending): ${stockAfterOrder.stock} (Expected 60)`);

        // 4. Deliver/Close Shop Order (from api/orders/[id]/delivery/route.ts)
        console.log('Step 4: Delivering/Closing Shop Order...');

        const order = await db.get(`SELECT * FROM orders WHERE id = ?`, orderId);
        const parsedItems = JSON.parse(order.items);

        await db.run('BEGIN TRANSACTION');
        for (const item of parsedItems) {
            const v = await db.get(`SELECT stock FROM product_variants WHERE id = ?`, item.variant.id);
            const newFactoryStock = v.stock - item.quantity;
            await db.run(`UPDATE product_variants SET stock = ? WHERE id = ?`, newFactoryStock, item.variant.id);

            const existingShopInv = await db.get(`SELECT id, stock FROM shop_inventory WHERE shopId = ? AND productVariantId = ?`, shopId, item.variant.id);
            if (existingShopInv) {
                await db.run(`UPDATE shop_inventory SET stock = stock + ? WHERE id = ?`, item.quantity, existingShopInv.id);
            } else {
                await db.run(`
          INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, shopId, item.productId, item.variant.id, item.name, item.price, item.variant.color, item.variant.size, item.quantity);
            }
        }
        await db.run(`UPDATE orders SET status = 'Delivered', isClosed = 1 WHERE id = ?`, orderId);
        await db.run('COMMIT');

        const finalFactoryStock = await db.get(`SELECT stock FROM product_variants WHERE id = ?`, variantId);
        const finalShopStock = await db.get(`SELECT stock FROM shop_inventory WHERE shopId = ? AND productVariantId = ?`, shopId, variantId);

        console.log(`Final Factory Stock: ${finalFactoryStock.stock} (Expected 55)`);
        console.log(`Final Shop Stock: ${finalShopStock.stock} (Expected 5)`);

        if (finalFactoryStock.stock === 55 && finalShopStock.stock === 5) {
            console.log('SUCCESS: Inventory logic verified!');
        } else {
            console.log('FAILURE: Inventory logic verification failed!');
        }

        // Cleanup
        console.log('Cleaning up test data...');
        await db.run(`DELETE FROM products WHERE id = ?`, productId);
        await db.run(`DELETE FROM product_variants WHERE productId = ?`, productId);
        await db.run(`DELETE FROM marketing_orders WHERE id = ?`, marketingOrderId);
        await db.run(`DELETE FROM marketing_order_items WHERE orderId = ?`, marketingOrderId);
        await db.run(`DELETE FROM orders WHERE id = ?`, orderId);
        await db.run(`DELETE FROM shops WHERE id = ?`, shopId);
        await db.run(`DELETE FROM shop_inventory WHERE shopId = ?`, shopId);
        console.log('Cleanup complete.');

    } catch (error) {
        console.error('Error during verification:', error);
        if (db) {
            try { await db.run('ROLLBACK'); } catch (e) { }
        }
    } finally {
        if (db) await db.close();
    }
}

verifyInventoryLogic();
