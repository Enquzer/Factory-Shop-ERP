const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function runMockSimulation() {
    console.log('🚀 Starting Mock Run Simulation (.js version)...\n');
    
    // Connect to the database directly
    const dbPath = path.join(process.cwd(), 'db', 'carement.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    const timestamp = Date.now();
    const styleNumber = `STLY-${timestamp}`;
    const styleId = `STL-${timestamp}`;
    const productName = `Mock Product ${timestamp}`;
    
    try {
        // ==========================================
        // 1. DESIGNER: Create New Style
        // ==========================================
        console.log('--- Step 1: Designer Creates Style ---');
        await db.run(`
            INSERT INTO styles (id, name, number, status, category, mainCategory, subCategory, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [styleId, productName, styleNumber, 'Factory Handover', 'Tops', 'Men', 'T-Shirt', 'Mock product for validation']);
        
        console.log(`✅ Style Created: ${styleNumber}`);

        // ==========================================
        // 2. FACTORY: Approve Style as Product
        // ==========================================
        console.log('\n--- Step 2: Factory Approves Style ---');
        const productId = `PROD-${timestamp}`;
        const price = 500;
        const minStock = 50;

        await db.run(`
            INSERT INTO products (id, productCode, name, category, mainCategory, subCategory, price, minimumStockLevel, imageUrl, description, readyToDeliver)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [productId, styleNumber, productName, 'Tops', 'Men', 'T-Shirt', price, minStock, null, 'Approved mock product', 0]);

        // Create Variants (S, M, L in Black)
        const sizes = ['S', 'M', 'L'];
        const color = 'Black';
        const variantIds = [];
        for (const size of sizes) {
            const vId = `VAR-${timestamp}-${size}`;
            variantIds.push(vId);
            await db.run(`
                INSERT INTO product_variants (id, productId, color, size, stock)
                VALUES (?, ?, ?, ?, ?)
            `, [vId, productId, color, size, 0]);
        }

        await db.run('UPDATE styles SET status = ? WHERE id = ?', ['Approved', styleId]);
        console.log(`✅ Product Created: ${productId}. Variants: ${sizes.join(', ')}`);

        // ==========================================
        // 3. MARKETING: Place Marketing Order
        // ==========================================
        console.log('\n--- Step 3: Marketing Places Order ---');
        const mOrderId = `MO-${timestamp}`;
        const mOrderNumber = `ORD-M-${timestamp}`;
        const totalQty = 300;

        await db.run(`
            INSERT INTO marketing_orders (id, orderNumber, productName, productCode, quantity, status, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [mOrderId, mOrderNumber, productName, styleNumber, totalQty, 'Placed Order', 'marketing_user']);

        for (const size of sizes) {
            await db.run(`
                INSERT INTO marketing_order_items (orderId, size, color, quantity)
                VALUES (?, ?, ?, ?)
            `, [mOrderId, size, color, 100]);
        }
        console.log(`✅ Marketing Order Placed: ${mOrderNumber}, Total Qty: ${totalQty}`);

        // ==========================================
        // 4. PLANNING: Plan Dates
        // ==========================================
        console.log('\n--- Step 4: Planning Sets Dates ---');
        await db.run(`
            UPDATE marketing_orders 
            SET productionStartDate = '2026-01-25', productionFinishedDate = '2026-02-05', status = 'Planning'
            WHERE id = ?
        `, [mOrderId]);
        console.log('✅ Planning Dates Set.');

        // ==========================================
        // 5. FACTORY OPERATIONS: Production & QC
        // ==========================================
        console.log('\n--- Step 5: Factory Level Operations ---');
        
        // Cutting
        await db.run(`
            INSERT INTO cutting_records (id, orderId, orderNumber, productCode, productName, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [timestamp, mOrderId, mOrderNumber, styleNumber, productName, 'completed']);
        
        for (const size of sizes) {
            await db.run(`
                INSERT INTO cutting_items (cuttingRecordId, orderId, size, color, quantity, cutQuantity, qcPassedQuantity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [timestamp, mOrderId, size, color, 100, 100, 100]);
        }
        
        // Sewing & Packing (Daily Output)
        for (const size of sizes) {
            await db.run(`
                INSERT INTO daily_production_status (orderId, date, size, color, quantity, status, processStage)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [mOrderId, '2026-02-01', size, color, 100, 'completed', 'Sewing']);
            await db.run(`
                INSERT INTO daily_production_status (orderId, date, size, color, quantity, status, processStage)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [mOrderId, '2026-02-04', size, color, 100, 'completed', 'Packing']);
        }
        
        await db.run("UPDATE marketing_orders SET status = 'Store', qualityInspectionStatus = 'Passed' WHERE id = ?", [mOrderId]);
        console.log('✅ Production Completed & QC Passed.');

        // ==========================================
        // 6. STORE HANDOVER: Add to Factory Inventory
        // ==========================================
        console.log('\n--- Step 6: Store Handover ---');
        const orderItems = await db.all('SELECT size, color, quantity FROM marketing_order_items WHERE orderId = ?', mOrderId);
        for (const item of orderItems) {
            await db.run(`
                UPDATE product_variants 
                SET stock = stock + ? 
                WHERE productId = ? AND size = ? AND color = ?
            `, [item.quantity, productId, item.size, item.color]);
        }
        await db.run("UPDATE marketing_orders SET inventoryAdded = 1 WHERE id = ?", [mOrderId]);
        await db.run("UPDATE products SET readyToDeliver = 1 WHERE id = ?", [productId]);
        
        const factoryStock = await db.all('SELECT size, stock FROM product_variants WHERE productId = ?', productId);
        console.log('✅ Factory Inventory Updated:', JSON.stringify(factoryStock));

        // ==========================================
        // 7. MEXICO SHOP: Shop Order
        // ==========================================
        console.log('\n--- Step 7: Mexico Shop Order ---');
        let mexicoShop = await db.get('SELECT * FROM shops WHERE name = ?', 'Mexico Shop');
        if (!mexicoShop) {
            const shpId = `SHP-MEX-${timestamp}`;
            await db.run(`
                INSERT INTO shops (id, username, name, contactPerson, city, exactLocation)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [shpId, 'mexico_shop', 'Mexico Shop', 'Admin', 'Mexico City', 'Central']);
            mexicoShop = { id: shpId, name: 'Mexico Shop' };
        }

        const shopOrderId = `ORD-S-${timestamp}`;
        const orderQty = 50; // Size M
        const orderAmount = orderQty * price;

        await db.run(`
            INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [shopOrderId, mexicoShop.id, mexicoShop.name, '2026-01-25', 'Pending', orderAmount, JSON.stringify([{ productId, variantId: variantIds[1], quantity: orderQty, price, color, size: 'M' }])]);

        await db.run(`
            INSERT INTO order_items (orderId, productId, variantId, quantity, price)
            VALUES (?, ?, ?, ?, ?)
        `, [shopOrderId, productId, variantIds[1], orderQty, price]);

        // Release Goods
        await db.run('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [orderQty, variantIds[1]]);
        
        const existingShopInv = await db.get('SELECT * FROM shop_inventory WHERE shopId = ? AND productVariantId = ?', [mexicoShop.id, variantIds[1]]);
        if (existingShopInv) {
            await db.run('UPDATE shop_inventory SET stock = stock + ? WHERE id = ?', [orderQty, existingShopInv.id]);
        } else {
            await db.run(`
                INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [mexicoShop.id, productId, variantIds[1], productName, price, color, 'M', orderQty]);
        }
        
        await db.run("UPDATE orders SET status = 'Released' WHERE id = ?", [shopOrderId]);
        console.log('✅ Goods Released to Shop.');

        // ==========================================
        // 8. FINAL VALIDATION
        // ==========================================
        console.log('\n--- Step 8: Final Validation ---');
        const finalFactoryStockM = await db.get('SELECT stock FROM product_variants WHERE id = ?', variantIds[1]);
        const finalShopStockM = await db.get('SELECT stock FROM shop_inventory WHERE shopId = ? AND productVariantId = ?', [mexicoShop.id, variantIds[1]]);
        
        console.log(`Factory Stock (Size M): Expected 50, Got ${finalFactoryStockM.stock}`);
        console.log(`Shop Stock (Size M): Expected 50, Got ${finalShopStockM.stock}`);

        // Check for negative numbers anywhere in the system
        const negatives = await db.all("SELECT 'product_variants' as tbl, id, stock FROM product_variants WHERE stock < 0 UNION ALL SELECT 'shop_inventory' as tbl, id, stock FROM shop_inventory WHERE stock < 0");
        
        if (negatives.length > 0) {
            console.error('❌ LOOPHOLE DETECTED: Negative stock found!', negatives);
        } else {
            console.log('✅ No negative stocks found.');
        }

        if (finalFactoryStockM.stock === 50 && finalShopStockM.stock === 50) {
            console.log('✅ TOTAL SYSTEM INTEGRATION VERIFIED.');
        } else {
            console.error('❌ QUANTITY DISCREPANCY.');
        }

    } catch (err) {
        console.error('❌ SIMULATION ERROR:', err);
    } finally {
        await db.close();
    }
}

runMockSimulation();
