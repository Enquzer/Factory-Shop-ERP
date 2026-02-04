const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/carement.db');

async function test() {
    console.log('--- Testing getConsumptionDatabase ---');
    const query = `
      SELECT 
        p.id as productId, 
        p.name as productName, 
        p.productCode, 
        p.imageUrl as productImage,
        rm.id as materialId,
        rm.id as materialCode,
        rm.name as materialName, 
        rm.imageUrl as materialImage,
        oi.color,
        b.quantityPerUnit, 
        rm.unitOfMeasure,
        SUM(COALESCE(oi.quantity, 0) * b.quantityPerUnit * (1 + (b.wastagePercentage / 100))) as totalHistoricalConsumption
      FROM products p
      JOIN product_bom b ON p.id = b.productId
      JOIN raw_materials rm ON b.materialId = rm.id
      LEFT JOIN marketing_orders o ON p.productCode = o.productCode
      LEFT JOIN marketing_order_items oi ON o.id = oi.orderId
      GROUP BY p.id, rm.id, oi.color
      ORDER BY p.productCode ASC, rm.name ASC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error:', err.message);
        } else {
            console.log('Found rows:', rows.length);
            if (rows.length > 0) {
                console.log('First row sample:', JSON.stringify(rows[0], null, 2));
            }
        }
        db.close();
    });
}

test();
