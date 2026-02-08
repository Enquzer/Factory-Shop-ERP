const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('=== DIAGNOSING ASSIGNMENT ISSUE ===\n');

// Check the problematic order
const orderId = 'ORD-1769276807144'; // From your error message

console.log(`Checking order: ${orderId}\n`);

// 1. Check if order exists and its status
db.get("SELECT id, status, trackingNumber FROM ecommerce_orders WHERE id = ?", [orderId], (err, order) => {
  if (err) {
    console.error('Error checking order:', err);
    db.close();
    return;
  }
  
  if (!order) {
    console.log('❌ Order not found in ecommerce_orders table');
    db.close();
    return;
  }
  
  console.log('✅ Order found:');
  console.log(`   Status: ${order.status}`);
  console.log(`   Tracking Number: ${order.trackingNumber}`);
  
  // 2. Check if there's a dispatch record
  db.get("SELECT * FROM order_dispatches WHERE order_id = ?", [orderId], (err, dispatch) => {
    if (err) {
      console.error('Error checking dispatch:', err);
    } else if (dispatch) {
      console.log('\n✅ Dispatch record found:');
      console.log(`   Driver ID: ${dispatch.driver_id}`);
      console.log(`   Status: ${dispatch.status}`);
      console.log(`   Tracking Number: ${dispatch.tracking_number}`);
      
      // Get driver info
      db.get("SELECT * FROM drivers WHERE id = ?", [dispatch.driver_id], (err, driver) => {
        if (err) {
          console.error('Error getting driver:', err);
        } else if (driver) {
          console.log(`   Driver Name: ${driver.name}`);
          console.log(`   Driver Employee ID: ${driver.employeeId}`);
          console.log(`   Driver Status: ${driver.status}`);
        }
        
        // 3. Check driver assignments
        const driverId = driver?.employeeId || driver?.name;
        if (driverId) {
          db.all("SELECT * FROM driver_assignments WHERE driver_id = ? AND order_id = ?", [driverId, orderId], (err, assignments) => {
            if (err) {
              console.error('Error checking driver assignments:', err);
            } else {
              console.log(`\n✅ Driver assignments for ${driverId}:`);
              if (assignments.length === 0) {
                console.log('   ❌ No assignments found!');
              } else {
                assignments.forEach(a => {
                  console.log(`   Assignment ${a.id}: Status=${a.status}, Created=${a.assignedAt}`);
                });
              }
            }
            
            // 4. Check all assignments for this driver
            if (driverId) {
              db.all("SELECT * FROM driver_assignments WHERE driver_id = ?", [driverId], (err, allAssignments) => {
                if (err) {
                  console.error('Error getting all assignments:', err);
                } else {
                  console.log(`\n📊 All assignments for driver ${driverId}:`);
                  allAssignments.forEach(a => {
                    console.log(`   Order ${a.order_id}: Status=${a.status}`);
                  });
                }
                
                db.close();
              });
            } else {
              db.close();
            }
          });
        } else {
          console.log('\n❌ Could not determine driver ID');
          db.close();
        }
      });
    } else {
      console.log('\n❌ No dispatch record found for this order');
      db.close();
    }
  });
});