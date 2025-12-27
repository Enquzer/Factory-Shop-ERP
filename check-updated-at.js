const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking shops table for updated_at column...\n');

db.serialize(() => {
    // Get table schema
    db.all("PRAGMA table_info(shops)", (err, columns) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }

        console.log('Shops table columns:');
        columns.forEach(col => {
            console.log(`  ${col.name}: ${col.type}${col.dflt_value ? ` (default: ${col.dflt_value})` : ''}`);
        });

        const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
        console.log(`\n✓ updated_at column exists: ${hasUpdatedAt}`);

        // Show a sample shop record
        db.get("SELECT * FROM shops LIMIT 1", (err, shop) => {
            if (err) {
                console.error('Error fetching shop:', err);
            } else if (shop) {
                console.log('\nSample shop record:');
                console.log(JSON.stringify(shop, null, 2));
            }
            db.close();
        });
    });
});
