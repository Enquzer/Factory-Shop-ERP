const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

db.all('SELECT id, name, vehicleType, status FROM drivers', [], (err, drivers) => {
  if (!err) {
    console.log('Sample drivers:');
    drivers.forEach(d => {
      console.log(`- ${d.name} (${d.vehicleType}): ${d.status}`);
    });
  }
  db.close();
});