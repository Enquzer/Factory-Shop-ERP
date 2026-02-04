const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/carement.db');

const tables = ['products', 'raw_materials', 'product_bom', 'marketing_orders', 'marketing_order_items'];

console.log('--- Row Counts ---');
tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
        if (err) console.error(`Error counting ${table}:`, err.message);
        else console.log(`${table}: ${row.count}`);
    });
});

setTimeout(() => db.close(), 1000);
