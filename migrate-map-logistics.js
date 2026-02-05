const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

async function migrate() {
  db.serialize(() => {
    console.log('Starting migration for Map and Logistics...');

    // 1. Add columns to shops
    db.run("ALTER TABLE shops ADD COLUMN latitude REAL", (err) => {
        if (err) console.log('Shops latitude column might already exist or error:', err.message);
        else console.log('Added latitude to shops');
    });
    db.run("ALTER TABLE shops ADD COLUMN longitude REAL", (err) => {
        if (err) console.log('Shops longitude column might already exist or error:', err.message);
        else console.log('Added longitude to shops');
    });

    // 2. Add columns to ecommerce_orders
    db.run("ALTER TABLE ecommerce_orders ADD COLUMN latitude REAL", (err) => {
        if (err) console.log('Ecommerce_orders latitude column might already exist or error:', err.message);
        else console.log('Added latitude to ecommerce_orders');
    });
    db.run("ALTER TABLE ecommerce_orders ADD COLUMN longitude REAL", (err) => {
        if (err) console.log('Ecommerce_orders longitude column might already exist or error:', err.message);
        else console.log('Added longitude to ecommerce_orders');
    });
    db.run("ALTER TABLE ecommerce_orders ADD COLUMN deliveryDistance REAL", (err) => {
        if (err) console.log('Ecommerce_orders deliveryDistance column might already exist or error:', err.message);
        else console.log('Added deliveryDistance to ecommerce_orders');
    });
    db.run("ALTER TABLE ecommerce_orders ADD COLUMN deliveryType TEXT", (err) => {
        if (err) console.log('Ecommerce_orders deliveryType column might already exist or error:', err.message);
        else console.log('Added deliveryType to ecommerce_orders');
    });

    console.log('Migration finished.');
    db.close();
  });
}

migrate();
