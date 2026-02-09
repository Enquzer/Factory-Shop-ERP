const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./factory-shop.sqlite', (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
});

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  console.log('Tables in database:');
  tables.forEach(table => {
    console.log('-', table.name);
  });
  
  // Check if assignments table exists
  const hasDrivers = tables.some(t => t.name === 'drivers');
  const hasDriverAssignments = tables.some(t => t.name === 'driver_assignments');
  const hasNotifications = tables.some(t => t.name === 'notifications');
  
  console.log('\nDriver system status:');
  console.log('- Drivers table:', hasDrivers ? '✅ Exists' : '❌ Missing');
  console.log('- Driver assignments table:', hasDriverAssignments ? '✅ Exists' : '❌ Missing');
  console.log('- Notifications table:', hasNotifications ? '✅ Exists' : '❌ Missing');
  
  db.close();
});