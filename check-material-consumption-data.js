const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'db/carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking material consumption data at:', dbPath);

// Check if products table exists and has data
async function checkDatabase() {
    const db = new sqlite3.Database(dbPath);
    
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM products", (err, rows) => {
            if (err) {
                console.error('Error checking products:', err);
                db.close();
                reject(err);
                return;
            }
            console.log('Products count:', rows.count);

            if (rows.count === 0) {
                console.log('No products found in the database.');
                db.close();
                resolve();
                return;
            }
            
            // Get some sample products
            db.all("SELECT id, productCode, name FROM products LIMIT 5", (err, productRows) => {
                if (err) {
                    console.error('Error fetching products:', err);
                    db.close();
                    reject(err);
                    return;
                }
                console.log('Sample products:', productRows);

                // Check BOM data for these products
                db.all(`
                    SELECT pb.*, rm.name as materialName, rm.unitOfMeasure
                    FROM product_bom pb
                    JOIN raw_materials rm ON pb.materialId = rm.id
                    LIMIT 10
                `, (err, bomRows) => {
                    if (err) {
                        console.error('Error fetching BOM data:', err);
                        db.close();
                        reject(err);
                        return;
                    }
                    console.log('BOM items count:', bomRows.length);
                    console.log('Sample BOM items:', bomRows);

                    // Check raw materials
                    db.get("SELECT COUNT(*) as count FROM raw_materials", (err, matRows) => {
                        if (err) {
                            console.error('Error checking raw materials:', err);
                            db.close();
                            reject(err);
                            return;
                        }
                        console.log('Raw materials count:', matRows.count);

                        if (matRows.count > 0) {
                            db.all("SELECT id, name, category FROM raw_materials LIMIT 5", (err, matSample) => {
                                if (err) {
                                    console.error('Error fetching raw materials:', err);
                                    db.close();
                                    reject(err);
                                    return;
                                }
                                console.log('Sample raw materials:', matSample);
                                
                                // Check marketing orders
                                db.get("SELECT COUNT(*) as count FROM marketing_orders", (err, orderRows) => {
                                    if (err) {
                                        console.error('Error checking marketing orders:', err);
                                        db.close();
                                        reject(err);
                                        return;
                                    }
                                    console.log('Marketing orders count:', orderRows.count);

                                    if (orderRows.count > 0) {
                                        db.all(`
                                            SELECT mo.id, mo.orderNumber, mo.productName, mo.productCode, 
                                                   COUNT(moi.id) as itemCount
                                            FROM marketing_orders mo
                                            LEFT JOIN marketing_order_items moi ON mo.id = moi.orderId
                                            GROUP BY mo.id
                                            LIMIT 5
                                        `, (err, orderSamples) => {
                                            if (err) {
                                                console.error('Error fetching marketing orders:', err);
                                                db.close();
                                                reject(err);
                                                return;
                                            }
                                            console.log('Sample marketing orders:', orderSamples);
                                            db.close();
                                            resolve();
                                        });
                                    } else {
                                        db.close();
                                        resolve();
                                    }
                                });
                            });
                        } else {
                            // No raw materials, still check marketing orders
                            db.get("SELECT COUNT(*) as count FROM marketing_orders", (err, orderRows) => {
                                if (err) {
                                    console.error('Error checking marketing orders:', err);
                                    db.close();
                                    reject(err);
                                    return;
                                }
                                console.log('Marketing orders count:', orderRows.count);

                                if (orderRows.count > 0) {
                                    db.all(`
                                        SELECT mo.id, mo.orderNumber, mo.productName, mo.productCode, 
                                               COUNT(moi.id) as itemCount
                                        FROM marketing_orders mo
                                        LEFT JOIN marketing_order_items moi ON mo.id = moi.orderId
                                        GROUP BY mo.id
                                        LIMIT 5
                                    `, (err, orderSamples) => {
                                        if (err) {
                                            console.error('Error fetching marketing orders:', err);
                                            db.close();
                                            reject(err);
                                            return;
                                        }
                                        console.log('Sample marketing orders:', orderSamples);
                                        db.close();
                                        resolve();
                                    });
                                } else {
                                    db.close();
                                    resolve();
                                }
                            });
                        }
                    });
                });
            });
        });
    });
}

// Execute the check
checkDatabase()
    .then(() => console.log('Database check completed.'))
    .catch(err => console.error('Database check failed:', err));