const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/carement.db');

async function run() {
  const tableInfos = {
    drivers: [
      { name: 'updatedAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'currentLat', type: 'REAL' },
      { name: 'currentLng', type: 'REAL' },
      { name: 'locationLastUpdated', type: 'DATETIME' }
    ],
    driver_assignments: [
      { name: 'driverId', type: 'TEXT' },
      { name: 'orderId', type: 'TEXT' },
      { name: 'assignedBy', type: 'TEXT' },
      { name: 'assignedAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'pickupLat', type: 'REAL' },
      { name: 'pickupLng', type: 'REAL' },
      { name: 'pickupName', type: 'TEXT' },
      { name: 'deliveryLat', type: 'REAL' },
      { name: 'deliveryLng', type: 'REAL' },
      { name: 'deliveryName', type: 'TEXT' },
      { name: 'estimatedDeliveryTime', type: 'DATETIME' },
      { name: 'actualPickupTime', type: 'DATETIME' },
      { name: 'actualDeliveryTime', type: 'DATETIME' },
      { name: 'notificationSent', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'createdAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ]
  };

  for (const [table, columns] of Object.entries(tableInfos)) {
    console.log(`Checking table: ${table}`);
    
    const existingCols = await new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name));
      });
    });

    for (const col of columns) {
      if (!existingCols.includes(col.name)) {
        console.log(`Adding column ${col.name} to ${table}`);
        try {
          await new Promise((resolve, reject) => {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        } catch (e) {
          console.error(`Failed to add ${col.name} to ${table}: ${e.message}`);
        }
      }
    }

    // Special case: copy data from snake_case to camelCase if they exist
    if (existingCols.includes('updated_at') && !existingCols.includes('updatedAt_Done')) {
       console.log(`Copying updated_at to updatedAt in ${table}`);
       await new Promise((resolve) => db.run(`UPDATE ${table} SET updatedAt = updated_at WHERE updatedAt IS NULL`, () => resolve()));
    }
    if (table === 'driver_assignments') {
      if (existingCols.includes('driver_id')) {
        await new Promise((resolve) => db.run(`UPDATE driver_assignments SET driverId = driver_id WHERE driverId IS NULL`, () => resolve()));
      }
      if (existingCols.includes('order_id')) {
        await new Promise((resolve) => db.run(`UPDATE driver_assignments SET orderId = order_id WHERE orderId IS NULL`, () => resolve()));
      }
      if (existingCols.includes('assigned_by')) {
        await new Promise((resolve) => db.run(`UPDATE driver_assignments SET assignedBy = assigned_by WHERE assignedBy IS NULL`, () => resolve()));
      }
      if (existingCols.includes('assigned_at')) {
        await new Promise((resolve) => db.run(`UPDATE driver_assignments SET assignedAt = assigned_at WHERE assignedAt IS NULL`, () => resolve()));
      }
    }
  }

  console.log('Migration complete');
  db.close();
}

run().catch(console.error);
