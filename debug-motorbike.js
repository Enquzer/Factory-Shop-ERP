const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('=== MOTORBIKE CAPACITY DEBUG ===\n');

// Check current driver assignments for Motor1
db.all("SELECT id, driverId, orderId, status FROM driver_assignments WHERE driverId = 'Motor1'", (err, assignments) => {
  if (err) {
    console.error('Error fetching assignments:', err);
    db.close();
    return;
  }
  
  console.log('Current assignments for Motor1:');
  assignments.forEach(a => {
    console.log(`  Assignment ${a.id}: Order ${a.orderId}, Status: ${a.status}`);
  });
  
  // Count active assignments
  const activeCount = assignments.filter(a => a.status !== 'delivered' && a.status !== 'cancelled').length;
  console.log(`\nActive assignments: ${activeCount}`);
  
  // Check driver status and capacity
  db.get("SELECT id, name, vehicleType, status FROM drivers WHERE name LIKE '%Motor%'", (err, driver) => {
    if (err) {
      console.error('Error fetching driver:', err);
    } else {
      console.log('\nDriver info:');
      console.log(`  Name: ${driver.name}`);
      console.log(`  Vehicle Type: ${driver.vehicleType}`);
      console.log(`  Current Status: ${driver.status}`);
      
      const maxCapacity = driver.vehicleType === 'motorbike' ? 3 : 1;
      console.log(`  Capacity: ${maxCapacity} orders`);
      console.log(`  Available slots: ${maxCapacity - activeCount}`);
      
      if (activeCount < maxCapacity && driver.status !== 'available') {
        console.log('\n⚠ ISSUE DETECTED: Driver should be available but status is', driver.status);
        console.log('  Fixing driver status...');
        
        // Fix the driver status
        db.run("UPDATE drivers SET status = 'available' WHERE name LIKE '%Motor%'", function(err) {
          if (err) {
            console.error('Error updating driver status:', err.message);
          } else {
            console.log('✓ Driver status updated to available');
          }
        });
      } else if (activeCount >= maxCapacity && driver.status !== 'busy') {
        console.log('\n⚠ ISSUE DETECTED: Driver should be busy but status is', driver.status);
      } else {
        console.log('\n✓ Status appears correct');
      }
    }
    
    // Close database after a short delay to allow updates to complete
    setTimeout(() => {
      db.close();
      console.log('\n=== DEBUG COMPLETE ===');
    }, 1000);
  });
});