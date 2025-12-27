
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function test() {
    try {
        const dbPath = path.join(process.cwd(), 'db', 'carement.db');
        console.log('Connecting to:', dbPath);
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        console.log('Connected!');

        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', tables.map(t => t.name));

        const shopsCount = await db.get("SELECT COUNT(*) as count FROM shops");
        console.log('Shops count:', shopsCount.count);

        await db.close();
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
