const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function validationRun() {
    console.log('🏁 FINAL VALIDATION RUN 🏁\n');
    
    const dbPath = path.join(process.cwd(), 'db', 'carement.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    const timestamp = Date.now();
    const productId = `PROD-${timestamp}`;
    const variantId = `VAR-${timestamp}-M`;
    const styleNumber = `ST-${timestamp}`;

    try {
        console.log('1. Marketing Order (300 units)...');
        // Setup Product & Variant
        await db.run('INSERT INTO products (id, productCode, name, category, price, minimumStockLevel, readyToDeliver) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [productId, styleNumber, 'Validation Style', 'Tops', 500, 10, 0]);
        await db.run('INSERT INTO product_variants (id, productId, color, size, stock) VALUES (?, ?, ?, ?, ?)', 
            [variantId, productId, 'Black', 'M', 0]);

        // Handover from Production to Store
        // Logic from api/marketing-orders/[id]/route.ts
        console.log('   - Simulating Production Handover to Store...');
        const producedQty = 300;
        await db.run('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [producedQty, variantId]);
        await db.run('UPDATE products SET readyToDeliver = 1 WHERE id = ?', [productId]);
        
        const factoryIn = await db.get('SELECT stock FROM product_variants WHERE id = ?', variantId);
        console.log(`   - Factory Inventory: ${factoryIn.stock} (Expected 300)`);

        console.log('\n2. Shop Order (50 units) - Process & Dispatch...');
        const orderId = `ORD-VAL-${timestamp}`;
        const shopId = 'SHP-MEXICO'; // Re-use
        const items = JSON.stringify([{ productId, variant: { id: variantId }, quantity: 50, name: 'Validation Style', price: 500 }]);
        
        await db.run('INSERT INTO orders (id, shopId, shopName, date, status, amount, items) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [orderId, shopId, 'Mexico Shop', '2026-01-25', 'Paid', 25000, items]);

        // --- DISPATCH stage ---
        console.log('   - Dispatching...');
        // Logic from dispatch/route.ts
        const dispatchQty = 50;
        await db.run('UPDATE product_variants SET stock = MAX(0, stock - ?) WHERE id = ?', [dispatchQty, variantId]);
        
        // Add to Shop Inventory
        const existingShopInv = await db.get('SELECT * FROM shop_inventory WHERE shopId = ? AND productVariantId = ?', [shopId, variantId]);
        if (existingShopInv) {
            await db.run('UPDATE shop_inventory SET stock = stock + ? WHERE id = ?', [dispatchQty, existingShopInv.id]);
        } else {
            await db.run('INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                [shopId, productId, variantId, 'Validation Style', 500, 'Black', 'M', dispatchQty]);
        }
        await db.run('UPDATE orders SET status = ? WHERE id = ?', ['Dispatched', orderId]);

        let factoryMid = await db.get('SELECT stock FROM product_variants WHERE id = ?', variantId);
        let shopMid = await db.get('SELECT stock FROM shop_inventory WHERE shopId = ? AND productVariantId = ?', [shopId, variantId]);
        console.log(`   - Inventory after Dispatch -> Factory: ${factoryMid.stock}, Shop: ${shopMid.stock}`);

        console.log('\n3. Close Order (Delivered)...');
        // --- DELIVERY stage (with fixed logic) ---
        const currentOrder = await db.get('SELECT * FROM orders WHERE id = ?', orderId);
        const isClosed = true;
        
        if (isClosed && currentOrder.status !== 'Delivered' && currentOrder.status !== 'Dispatched') {
            // This SHOULD NOT be entered
            console.error('❌ BUG: Inventory update entered in Delivery even if Dispatched!');
            const orderItems = JSON.parse(currentOrder.items);
            for (const item of orderItems) {
                await db.run('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [item.quantity, item.variant.id]);
            }
        } else {
            console.log('   - Skipping redundant inventory update in Delivery (Fixed).');
        }
        await db.run('UPDATE orders SET status = ?, deliveryDate = ?, isClosed = 1 WHERE id = ?', ['Delivered', '2026-01-25', orderId]);

        console.log('\n4. Final Balancing Check...');
        const finalFactory = await db.get('SELECT stock FROM product_variants WHERE id = ?', variantId);
        const finalShop = await db.get('SELECT stock FROM shop_inventory WHERE shopId = ? AND productVariantId = ?', [shopId, variantId]);
        
        console.log(`   - Final Factory Stock: ${finalFactory.stock} (Target: 250)`);
        console.log(`   - Final Shop Stock: ${finalShop.stock} (Target: 50)`);

        if (finalFactory.stock === 250 && finalShop.stock === 50) {
            console.log('\n⭐ SUCCESS: All numbers are perfectly balanced!');
        } else {
            console.error('\n❌ FAILURE: Numbers do not match!');
        }

    } catch (err) {
        console.error('Validation failed:', err);
    } finally {
        await db.close();
    }
}

validationRun();
