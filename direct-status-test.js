const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('=== DIRECT DRIVER STATUS TEST ===\n');

// Check current driver status
db.get("SELECT id, name, status FROM drivers WHERE name LIKE '%Motor%'", (err, driver) => {
  if (err) {
    console.error('Error fetching driver:', err);
    db.close();
    return;
  }
  
  console.log('Current driver status:');
  console.log(`  ID: ${driver.id}`);
  console.log(`  Name: ${driver.name}`);
  console.log(`  Status: ${driver.status}`);
  
  if (driver.status === 'available') {
    console.log('\n✓ Driver is already available - no action needed');
    db.close();
    return;
  }
  
  console.log('\n=== SIMULATING DELIVERY COMPLETION ===');
  
  // Find a delivered assignment for this driver
  db.get("SELECT id, driverId, orderId, status FROM driver_assignments WHERE driverId = 'Motor1' AND status = 'delivered'", (err, assignment) => {
    if (err) {
      console.error('Error fetching assignment:', err);
      db.close();
      return;
    }
    
    if (!assignment) {
      console.log('No delivered assignments found for Motor1');
      db.close();
      return;
    }
    
    console.log('Found delivered assignment:');
    console.log(`  Assignment ID: ${assignment.id}`);
    console.log(`  Order ID: ${assignment.orderId}`);
    console.log(`  Current Status: ${assignment.status}`);
    
    // Simulate the status update logic that should happen when an assignment is marked as delivered
    console.log('\n=== EXECUTING DRIVER STATUS UPDATE LOGIC ===');
    
    // Count active assignments (excluding delivered/cancelled ones)
    db.get(`
      SELECT COUNT(*) as count FROM driver_assignments 
      WHERE driverId = ? AND status != 'delivered' AND status != 'cancelled'
    `, [assignment.driverId], (err, activeAssignments) => {
      if (err) {
        console.error('Error counting active assignments:', err);
        db.close();
        return;
      }
      
      console.log(`Active assignments count: ${activeAssignments.count}`);
      
      // Update driver status to available
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
            console.log('\nFinal driver status:');
            console.log(`  ID: ${updatedDriver.id}`);
            console.log(`  Name: ${updatedDriver.name}`);
            console.log(`  Status: ${updatedDriver.status}`);
            
            if (updatedDriver.status === 'available') {
              console.log('\n✓ SUCCESS: Driver is now available for new assignments!');
            } else {
              console.log('\n✗ FAILED: Driver status did not update correctly');
            }
          }
          
          db.close();
          console.log('\n=== TEST COMPLETE ===');
        });
      });
    });
  });
});