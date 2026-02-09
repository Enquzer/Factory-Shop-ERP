const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

console.log('Checking drivers in database...\n');

db.all('SELECT id, name, status, vehicleType, currentLat, currentLng FROM drivers', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('All drivers:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}, Status: ${row.status}, Vehicle: ${row.vehicleType}`);
      console.log(`  Location: ${row.currentLat}, ${row.currentLng}`);
    });
  }
  
  db.close();
});