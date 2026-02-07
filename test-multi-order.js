// Test multi-order functionality for motorbike drivers
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('=== MULTI-ORDER FUNCTIONALITY TEST ===\n');

// Test scenario: Assign multiple orders to Motor1 (motorbike driver)
async function testMultiOrderAssignment() {
  try {
    // Check current driver info
    const driver = await new Promise((resolve, reject) => {
      db.get("SELECT id, name, vehicleType, status FROM drivers WHERE name LIKE '%Motor%'", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('Driver Info:');
    console.log(`  ID: ${driver.id}`);
    console.log(`  Name: ${driver.name}`);
    console.log(`  Vehicle Type: ${driver.vehicleType}`);
    console.log(`  Current Status: ${driver.status}`);
    
    // Check current assignments
    const currentAssignments = await new Promise((resolve, reject) => {
      db.all(`
        SELECT COUNT(*) as count FROM driver_assignments 
        WHERE driverId = 'Motor1' AND status != 'delivered' AND status != 'cancelled'
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0].count);
      });
    });
    
    console.log(`\nCurrent active assignments: ${currentAssignments}`);
    
    // Motorbike capacity is 3 orders
    const maxCapacity = 3;
    const availableSlots = maxCapacity - currentAssignments;
    
    console.log(`Motorbike capacity: ${maxCapacity}`);
    console.log(`Available slots: ${availableSlots}`);
    
    if (availableSlots > 0) {
      console.log(`\n=== ASSIGNING ${availableSlots} NEW ORDERS ===`);
      
      // Create test orders if needed
      for (let i = 1; i <= availableSlots; i++) {
        const orderId = `TEST-ORDER-${Date.now()}-${i}`;
        const assignmentId = Date.now() + i;
        
        // Insert test assignment
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO driver_assignments (
              id, driverId, orderId, assignedBy, status,
              pickupLat, pickupLng, pickupName,
              deliveryLat, deliveryLng, deliveryName
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            assignmentId, 'Motor1', orderId, 'test-admin', 'assigned',
            9.03, 38.75, 'Test Pickup Location',
            9.05, 38.77, 'Test Delivery Location'
          ], function(err) {
            if (err) reject(err);
            else {
              console.log(`✓ Assigned order ${orderId} (Assignment ID: ${assignmentId})`);
              resolve();
            }
          });
        });
      }
      
      // Update driver status based on new capacity
      const newActiveCount = currentAssignments + availableSlots;
      let newStatus = 'available';
      if (newActiveCount >= maxCapacity) {
        newStatus = 'busy';
      }
      
      await new Promise((resolve, reject) => {
        db.run("UPDATE drivers SET status = ? WHERE name LIKE '%Motor%'", [newStatus], function(err) {
          if (err) reject(err);
          else {
            console.log(`✓ Driver status updated to: ${newStatus}`);
            resolve();
          }
        });
      });
      
      console.log(`\nFinal state:`);
      console.log(`  Active assignments: ${newActiveCount}/${maxCapacity}`);
      console.log(`  Driver status: ${newStatus}`);
      
      if (newActiveCount < maxCapacity) {
        console.log(`✓ Driver can accept ${(maxCapacity - newActiveCount)} more orders`);
      } else {
        console.log(`⚠ Driver has reached maximum capacity (${maxCapacity} orders)`);
      }
      
    } else {
      console.log('\n⚠ Driver has reached maximum capacity. No new orders can be assigned.');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    db.close();
    console.log('\n=== TEST COMPLETE ===');
  }
}

// Run the test
testMultiOrderAssignment();