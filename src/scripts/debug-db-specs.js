
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../db/carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database at:', dbPath);

db.serialize(() => {
    // 1. Check if table exists
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='style_specifications'", (err, rows) => {
        if (err) {
            console.error('Error checking table:', err);
            return;
        }
        console.log('Table existence check:', rows);

        if (rows.length === 0) {
            console.log('Table style_specifications MISSING. Creating it...');
            db.run(`
                CREATE TABLE IF NOT EXISTS style_specifications (
                    id TEXT PRIMARY KEY,
                    styleId TEXT NOT NULL,
                    category TEXT NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT,
                    imageUrl TEXT,
                    comments TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (styleId) REFERENCES styles (id) ON DELETE CASCADE
                )
            `, (err) => {
                if(err) console.error("Create table failed:", err);
                else console.log("Table created successfully.");
                
                checkContent();
            });
        } else {
            console.log('Table exists. Checking content...');
            checkContent();
        }
    });
});

function checkContent() {
    db.all("SELECT * FROM style_specifications", (err, rows) => {
        if (err) console.error(err);
        else {
            console.log(`Found ${rows.length} specifications.`);
            console.log(JSON.stringify(rows, null, 2));
        }
    });

    // Also check styles count
    db.all("SELECT id, name FROM styles", (err, rows) => {
        console.log(`Found ${rows ? rows.length : 0} styles.`);
    });
}
