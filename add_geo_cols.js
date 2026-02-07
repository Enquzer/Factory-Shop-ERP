const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/carement.db');

const cols = [
  { name: 'pickupLat', type: 'REAL' },
  { name: 'pickupLng', type: 'REAL' },
  { name: 'pickupName', type: 'TEXT' },
  { name: 'deliveryLat', type: 'REAL' },
  { name: 'deliveryLng', type: 'REAL' },
  { name: 'deliveryName', type: 'TEXT' },
  { name: 'estimatedDeliveryTime', type: 'DATETIME' },
  { name: 'actualPickupTime', type: 'DATETIME' },
  { name: 'actualDeliveryTime', type: 'DATETIME' }
];

async function run() {
  for (const col of cols) {
    await new Promise((resolve) => {
      db.run(`ALTER TABLE driver_assignments ADD COLUMN ${col.name} ${col.type}`, (err) => {
        if (err) console.log(`${col.name}: ${err.message}`);
        else console.log(`${col.name}: SUCCESS`);
        resolve();
      });
    });
  }
  db.close();
}

run();
