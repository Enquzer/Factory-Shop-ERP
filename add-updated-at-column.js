const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding updated_at column to shops table...\n');

db.serialize(() => {
    // Add the column
    db.run("ALTER TABLE shops ADD COLUMN updated_at DATETIME", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✓ Column already exists');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('✓ Successfully added updated_at column');

            // Initialize values for existing records
            db.run("UPDATE shops SET updated_at = created_at WHERE updated_at IS NULL", (err) => {
                if (err) {
                    console.error('Error initializing values:', err.message);
                } else {
                    console.log('✓ Initialized updated_at values for existing shops');
                }
            });
        }

        // Verify
        setTimeout(() => {
            db.all("PRAGMA table_info(shops)", (err, columns) => {
                if (!err) {
                    const hasUpdatedAt = columns.some(col => col.name === 'updated_at');
                    console.log(`\n✓ Verification: updated_at column exists: ${hasUpdatedAt}`);
                }
                db.close();
            });
        }, 100);
    });
});
