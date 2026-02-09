const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

db.run('INSERT INTO drivers (id, name, vehicleType, status, phone) VALUES (1, "Motor1", "motorbike", "available", "123-456-7890")', (err) => {
  if (err) {
    console.error('Insert error:', err);
  } else {
    console.log('Driver inserted successfully');
  }
  
  // Check what's in the table
  db.all('SELECT * FROM drivers', [], (err, rows) => {
    console.log('Current drivers:', rows);
    db.close();
  });
});