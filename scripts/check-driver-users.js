const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

console.log('Checking for driver users...\n');

db.all('SELECT username, role FROM users WHERE role = "driver"', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Driver users found:');
    if (rows.length === 0) {
      console.log('No driver users found in the database');
    } else {
      rows.forEach(row => {
        console.log(`Username: ${row.username}, Role: ${row.role}`);
      });
    }
  }
  
  // Also check if Motor1 driver has a corresponding user
  db.get('SELECT id, name, userId FROM drivers WHERE name = "Motor1"', [], (err, driver) => {
    if (err) {
      console.error('Error checking Motor1 driver:', err);
    } else {
      console.log('\nMotor1 driver info:');
      console.log(`ID: ${driver.id}, Name: ${driver.name}, UserId: ${driver.userId}`);
      
      if (driver.userId) {
        db.get('SELECT username FROM users WHERE id = ?', [driver.userId], (err, user) => {
          if (!err && user) {
            console.log(`Associated user: ${user.username}`);
          }
          db.close();
        });
      } else {
        console.log('No associated user found');
        db.close();
      }
    }
  });
});