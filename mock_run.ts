import { getDb } from './src/lib/db';
import { v4 as uuidv4 } from 'uuid';

async function runMockSimulation() {
    console.log('🚀 Starting Mock Run Simulation...\n');
    const db = await getDb();
    
    const timestamp = Date.now();
    const styleNumber = `STYLE-${timestamp}`;
    const styleId = `STL-${timestamp}`;
    const productName = `Mock Product ${timestamp}`;
    
    // ==========================================
    // 1. DESIGNER: Create New Style
    // ==========================================
    console.log('--- Step 1: Designer Creates Style ---');
    await db.run(`
        INSERT INTO styles (id, name, number, status, category, mainCategory, subCategory, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [styleId, productName, styleNumber, 'Factory Handover', 'Tops', 'Men', 'T-Shirt', 'Mock product for validation']);
    
    const style = await db.get('SELECT * FROM styles WHERE id = ?', styleId);
    console.log(`✅ Style Created: ${style.number} (${style.status})`);

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
    const variantIds: string[] = [];
    for (const size of sizes) {
        const vId = `VAR-${timestamp}-${size}`;
        variantIds.push(vId);
        await db.run(`
            INSERT INTO product_variants (id, productId, color, size, stock)
            VALUES (?, ?, ?, ?, ?)
        `, [vId, productId, color, size, 0]);
    }

    await db.run('UPDATE styles SET status = ? WHERE id = ?', ['Approved', styleId]);
    console.log(`✅ Product Created: ${productId} with ${sizes.length} variants. Factory Stock Initialized to 0.`);

    // ==========================================
    // 3. MARKETING: Place Marketing Order
    // ==========================================
    console.log('\n--- Step 3: Marketing Places Order ---');
    const mOrderId = `MO-${timestamp}`;
    const mOrderNumber = `ORD-M-${timestamp}`;
    const totalQty = 300; // 100 each for S, M, L

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
    console.log(`✅ Marketing Order Placed: ${mOrderNumber}, Total Quantity: ${totalQty}`);

    // ==========================================
    // 4. PLANNING: Plan Dates
    // ==========================================
    console.log('\n--- Step 4: Planning Sets Dates ---');
    const startDate = '2026-01-25';
    const endDate = '2026-02-05';
    await db.run(`
        UPDATE marketing_orders 
        SET productionStartDate = ?, productionFinishedDate = ?, status = 'Planning'
        WHERE id = ?
    `, [startDate, endDate, mOrderId]);
    
    // Add component for planning
    await db.run(`
        INSERT INTO marketing_order_components (orderId, componentName, cuttingStartDate, cuttingFinishDate, sewingStartDate, sewingFinishDate, packingStartDate, packingFinishDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [mOrderId, 'Main Body', startDate, '2026-01-27', '2026-01-28', '2026-02-02', '2026-02-03', endDate]);
    console.log('✅ Planning Dates Set.');

    // ==========================================
    // 5. FACTORY OPERATIONS: Production & QC
    // ==========================================
    console.log('\n--- Step 5: Factory Level Operations (Production & QC) ---');
    
    // --- Cutting ---
    console.log('  - Performing Cutting...');
    const cuttingRecordId = timestamp;
    await db.run(`
        INSERT INTO cutting_records (id, orderId, orderNumber, productCode, productName, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [cuttingRecordId, mOrderId, mOrderNumber, styleNumber, productName, 'completed']);
    
    for (const size of sizes) {
        await db.run(`
            INSERT INTO cutting_items (cuttingRecordId, orderId, size, color, quantity, cutQuantity, qcPassedQuantity)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [cuttingRecordId, mOrderId, size, color, 100, 100, 100]);
    }
    await db.run("UPDATE marketing_orders SET cuttingStatus = 'completed', status = 'Sewing' WHERE id = ?", [mOrderId]);

    // --- Sewing ---
    console.log('  - Performing Sewing...');
    for (const size of sizes) {
        await db.run(`
            INSERT INTO daily_production_status (orderId, date, size, color, quantity, status, processStage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [mOrderId, '2026-02-01', size, color, 100, 'completed', 'Sewing']);
    }
    await db.run("UPDATE marketing_orders SET sewingStatus = 'completed', status = 'Packing' WHERE id = ?", [mOrderId]);

    // --- Packing ---
    console.log('  - Performing Packing...');
    for (const size of sizes) {
        await db.run(`
            INSERT INTO daily_production_status (orderId, date, size, color, quantity, status, processStage)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [mOrderId, '2026-02-04', size, color, 100, 'completed', 'Packing']);
    }
    await db.run("UPDATE marketing_orders SET packingStatus = 'completed', status = 'Quality Inspection' WHERE id = ?", [mOrderId]);

    // --- QC ---
    console.log('  - Quality Audit...');
    await db.run("UPDATE marketing_orders SET qualityInspectionStatus = 'Passed', status = 'Store' WHERE id = ?", [mOrderId]);
    console.log('✅ Production Finished & QC Passed.');

    // ==========================================
    // 6. STORE HANDOVER: Add to Factory Inventory
    // ==========================================
    console.log('\n--- Step 6: Store Handover (Factory Inventory Update) ---');
    
    // Simulate the logic from API: update product stock based on marketing_order_items
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

    // Check Factory Stock
    const factoryStock = await db.all('SELECT size, stock FROM product_variants WHERE productId = ?', productId);
    console.log('✅ Factory Inventory Updated:', JSON.stringify(factoryStock));

    // ==========================================
    // 7. MEXICO SHOP: Shop Order
    // ==========================================
    console.log('\n--- Step 7: Mexico Shop Order ---');
    
    // Ensure Mexico Shop exists
    let mexicoShop = await db.get('SELECT * FROM shops WHERE name = ?', 'Mexico Shop');
    if (!mexicoShop) {
        mexicoShop = { id: `SHP-MEX-${timestamp}`, name: 'Mexico Shop', city: 'Mexico City', exactLocation: 'Central' };
        await db.run(`
            INSERT INTO shops (id, username, name, contactPerson, city, exactLocation)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [mexicoShop.id, 'mexico_shop', mexicoShop.name, 'Admin', mexicoShop.city, mexicoShop.exactLocation]);
    }

    const shopOrderId = `ORD-S-${timestamp}`;
    const orderQty = 50; // Order 50 pieces of SIZE M
    const orderAmount = orderQty * price;

    await db.run(`
        INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [shopOrderId, mexicoShop.id, mexicoShop.name, '2026-01-25', 'Pending', orderAmount, JSON.stringify([{ productId, variantId: variantIds[1], quantity: orderQty, price, color, size: 'M' }])]);

    await db.run(`
        INSERT INTO order_items (orderId, productId, variantId, quantity, price)
        VALUES (?, ?, ?, ?, ?)
    `, [shopOrderId, productId, variantIds[1], orderQty, price]);

    console.log(`✅ Shop Order Placed: ${shopOrderId}, Quantity: ${orderQty} (Size M)`);

    // --- Order Processing ---
    console.log('  - Processing Order (Confirmation -> Payment -> Release)...');
    await db.run("UPDATE orders SET status = 'Confirmed' WHERE id = ?", [shopOrderId]);
    await db.run("UPDATE orders SET status = 'Paid', paymentSlipUrl = 'mock-slip.pdf' WHERE id = ?", [shopOrderId]);
    
    // --- RELEASE GOODS (The critical part) ---
    console.log('  - Releasing Goods to Shop Inventory...');
    
    // Simulate Release Logic:
    // 1. Subtract from Factory Stock
    // 2. Add to Shop Inventory
    
    const shopOrderItems = await db.all('SELECT * FROM order_items WHERE orderId = ?', shopOrderId);
    for (const item of shopOrderItems) {
        // Find variant details
        const variant = await db.get('SELECT * FROM product_variants WHERE id = ?', item.variantId);
        
        // 1. Deduct from Factory
        await db.run('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [item.quantity, item.variantId]);
        
        // 2. Add to Shop Inventory
        const existingShopInv = await db.get('SELECT * FROM shop_inventory WHERE shopId = ? AND productVariantId = ?', [mexicoShop.id, item.variantId]);
        if (existingShopInv) {
            await db.run('UPDATE shop_inventory SET stock = stock + ? WHERE id = ?', [item.quantity, existingShopInv.id]);
        } else {
            await db.run(`
                INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [mexicoShop.id, productId, item.variantId, productName, price, color, variant.size, item.quantity]);
        }
    }
    await db.run("UPDATE orders SET status = 'Released' WHERE id = ?", [shopOrderId]);
    console.log('✅ Goods Released.');

    // ==========================================
    // 8. FINAL VALIDATION & LOOPHOLE CHECK
    // ==========================================
    console.log('\n--- Step 8: Final Validation ---');
    
    const finalFactoryStockM = await db.get('SELECT stock FROM product_variants WHERE id = ?', variantIds[1]);
    const finalShopStockM = await db.get('SELECT stock FROM shop_inventory WHERE shopId = ? AND productVariantId = ?', [mexicoShop.id, variantIds[1]]);
    
    console.log(`Factory Stock (Size M): Expected: 50 (100-50), Actual: ${finalFactoryStockM.stock}`);
    console.log(`Shop Inventory (Size M): Expected: 50, Actual: ${finalShopStockM.stock}`);

    // Loophole check: Negative numbers
    const allNegativeStocks = await db.all('SELECT id, stock FROM product_variants WHERE stock < 0');
    const allShopNegativeStocks = await db.all('SELECT id, stock FROM shop_inventory WHERE stock < 0');
    
    if (allNegativeStocks.length > 0 || allShopNegativeStocks.length > 0) {
        console.error('❌ LOOPHOLE DETECTED: Negative stock found!');
        console.error('Factory:', allNegativeStocks);
        console.error('Shop:', allShopNegativeStocks);
    } else {
        console.log('✅ NO NEGATIVE STOCKS FOUND.');
    }

    if (finalFactoryStockM.stock === 50 && finalShopStockM.stock === 50) {
        console.log('✅ QUANTITY CONSISTENCY VERIFIED: Marketing order matches entry + release reduces and adds correctly.');
    } else {
        console.error('❌ QUANTITY DISCREPANCY FOUND!');
    }

    console.log('\n🚀 Mock Run Simulation Completed Successfully.');
}

runMockSimulation().catch(console.error);
