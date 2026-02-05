const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

async function runMigration() {
  db.serialize(() => {
    // Add missing columns to ecommerce_orders
    const columnsToAdd = [
      { name: 'transportationCost', type: 'REAL DEFAULT 0' },
      { name: 'dispatchedFromShopId', type: 'TEXT' },
      { name: 'dispatchDate', type: 'DATETIME' },
      { name: 'trackingNumber', type: 'TEXT' },
      { name: 'paymentMethod', type: 'TEXT' },
      { name: 'paymentReference', type: 'TEXT' }
    ];

    db.all("PRAGMA table_info(ecommerce_orders)", (err, rows) => {
      if (err) {
        console.error('Error checking table info:', err);
        return;
      }

      const existingColumns = rows.map(r => r.name);
      
      columnsToAdd.forEach(col => {
        if (!existingColumns.includes(col.name)) {
          console.log(`Adding column ${col.name} to ecommerce_orders...`);
          db.run(`ALTER TABLE ecommerce_orders ADD COLUMN ${col.name} ${col.type}`, (err) => {
            if (err) console.error(`Error adding ${col.name}:`, err);
            else console.log(`Column ${col.name} added successfully.`);
          });
        } else {
          console.log(`Column ${col.name} already exists.`);
        }
      });
    });
  });
}

runMigration();
