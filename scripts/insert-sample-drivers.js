const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

const drivers = [
  [1, 'Motor1', 'Motor Bike 1', 'motorbike', 'available'],
  [2, 'Car1', 'Car 1', 'car', 'available'],
  [3, 'Van1', 'Van 1', 'van', 'available']
];

let inserted = 0;
drivers.forEach(([id, name, vehicleType, status], index) => {
  db.run(
    `INSERT OR IGNORE INTO drivers (id, name, vehicleType, status, phone) VALUES (?, ?, ?, ?, ?)`,
    [id, name, vehicleType, status, '123-456-7890'],
    (err) => {
      if (err) {
        console.error(`Error inserting ${name}:`, err);
      } else {
        console.log(`✅ ${name} inserted`);
        inserted++;
      }
      
      // Close database after all inserts
      if (index === drivers.length - 1) {
        setTimeout(() => {
          console.log(`\n🎉 ${inserted} drivers inserted successfully!`);
          db.close();
        }, 100);
      }
    }
  );
});