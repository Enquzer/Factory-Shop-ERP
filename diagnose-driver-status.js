const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('=== DRIVER STATUS DIAGNOSIS ===\n');

// Check driver assignments for Motor1
db.all("SELECT id, driverId, orderId, status FROM driver_assignments WHERE driverId = 'Motor1'", (err, assignments) => {
  if (err) {
    console.error('Error fetching assignments:', err);
    db.close();
    return;
  }
  
  console.log('Driver assignments for Motor1:');
  if (assignments.length === 0) {
    console.log('  No assignments found');
  } else {
    assignments.forEach(a => {
      console.log(`  Assignment ${a.id}: Order ${a.orderId}, Status: ${a.status}`);
    });
  }
  
  // Check driver status in drivers table
  db.get("SELECT id, name, status FROM drivers WHERE name LIKE '%Motor%'", (err, driver) => {
    if (err) {
      console.error('Error fetching driver:', err);
    } else {
      console.log('\nDriver record:');
      console.log(`  ID: ${driver.id}`);
      console.log(`  Name: ${driver.name}`);
      console.log(`  Status: ${driver.status}`);
    }
    
    // Check if there are any delivered assignments that should trigger status change
    db.all("SELECT COUNT(*) as count FROM driver_assignments WHERE driverId = 'Motor1' AND status = 'delivered'", (err, delivered) => {
      if (!err) {
        console.log(`\nDelivered assignments count: ${delivered[0].count}`);
      }
      
      // Force update driver status to available
      console.log('\n=== FORCING DRIVER STATUS UPDATE ===');
      db.run("UPDATE drivers SET status = 'available' WHERE name LIKE '%Motor%'", function(err) {
        if (err) {
          console.error('Error updating driver status:', err.message);
        } else {
          console.log('✓ Driver status updated to available');
          console.log('Rows affected:', this.changes);
        }
        
        // Verify the update
        db.get("SELECT id, name, status FROM drivers WHERE name LIKE '%Motor%'", (err, updatedDriver) => {
          if (!err) {
            console.log('\nUpdated driver record:');
            console.log(`  ID: ${updatedDriver.id}`);
            console.log(`  Name: ${updatedDriver.name}`);
            console.log(`  Status: ${updatedDriver.status}`);
          }
          
          db.close();
          console.log('\n=== DIAGNOSIS COMPLETE ===');
        });
      });
    });
  });
});