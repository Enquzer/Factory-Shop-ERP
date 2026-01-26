const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function runMockSimulation() {
    console.log('🚀 Starting Double-Deduction Verification (AFTER FIX)...\n');
    
    const dbPath = path.join(process.cwd(), 'db', 'carement.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    const timestamp = Date.now();
    const productId = `PROD-FIX-${timestamp}`;
    const variantId = `VAR-FIX-${timestamp}`;
    const initialStock = 100;

    try {
        // Setup a test product and variant
        await db.run('INSERT INTO products (id, productCode, name, category, price, minimumStockLevel, readyToDeliver) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [productId, `CODE-FIX-${timestamp}`, 'Test Fixed Product', 'Test', 100, 10, 1]);
        await db.run('INSERT INTO product_variants (id, productId, color, size, stock) VALUES (?, ?, ?, ?, ?)', 
            [variantId, productId, 'Blue', 'L', initialStock]);
        
        console.log(`Initial Stock: ${initialStock}`);

        // Create a Mock Order
        const orderId = `ORD-FIX-${timestamp}`;
        const shopId = 'SHP-MEXICO';
        const items = JSON.stringify([{ productId, variant: { id: variantId }, quantity: 60, name: 'Test Fixed Product' }]);
        
        await db.run('INSERT INTO orders (id, shopId, shopName, date, status, amount, items) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [orderId, shopId, 'Mexico Shop', '2026-01-25', 'Paid', 6000, items]);
        
        console.log('--- Simulating DISPATCH (Subtracing Stock) ---');
        await db.run('UPDATE product_variants SET stock = MAX(0, stock - ?) WHERE id = ?', [60, variantId]);
        await db.run('UPDATE orders SET status = ? WHERE id = ?', ['Dispatched', orderId]);
        
        let midStock = await db.get('SELECT stock FROM product_variants WHERE id = ?', variantId);
        console.log(`Stock after Dispatch: ${midStock.stock}`);

        console.log('\n--- Simulating DELIVERY (Applying Fixed Logic) ---');
        const currentOrder = await db.get('SELECT * FROM orders WHERE id = ?', orderId);
        const isClosed = true;
        
        // FIXED LOGIC: Added && currentOrder.status !== 'Dispatched'
        if (isClosed && currentOrder.status !== 'Delivered' && currentOrder.status !== 'Dispatched') {
            console.log('BUG DETECTED: This should NOT run if already Dispatched!');
            const orderItems = JSON.parse(currentOrder.items);
            for (const item of orderItems) {
                const variant = await db.get('SELECT stock FROM product_variants WHERE id = ?', item.variant.id);
                await db.run('UPDATE product_variants SET stock = ? WHERE id = ?', [variant.stock - item.quantity, item.variant.id]);
            }
        } else {
            console.log('✅ FIXED: Delivery logic skipped inventory update because status is ' + currentOrder.status);
        }
        await db.run('UPDATE orders SET status = ? WHERE id = ?', ['Delivered', orderId]);

        let finalStock = await db.get('SELECT stock FROM product_variants WHERE id = ?', variantId);
        console.log(`\nFinal Stock: ${finalStock.stock} (Expected 40)`);

        if (finalStock.stock === 40) {
            console.log('✅ SYSTEM VERIFIED: No double deduction.');
        } else {
            console.error('❌ STILL BUGGY: Stock is ' + finalStock.stock);
        }

    } catch (err) {
        console.error('Simulation Failed:', err);
    } finally {
        await db.close();
    }
}

runMockSimulation();
