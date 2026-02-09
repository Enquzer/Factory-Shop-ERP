const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

// Create a test assignment
const testAssignment = {
  driverId: '1',
  orderId: 'TEST-ORDER-001',
  assignedBy: 'admin',
  pickupLat: 9.03,
  pickupLng: 38.74,
  pickupName: 'Mexico Shop',
  deliveryLat: 9.05,
  deliveryLng: 38.76,
  deliveryName: 'Customer Address'
};

db.run(`
  INSERT INTO driver_assignments (
    driverId, orderId, assignedBy,
    pickupLat, pickupLng, pickupName,
    deliveryLat, deliveryLng, deliveryName,
    status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned')
`, [
  testAssignment.driverId,
  testAssignment.orderId,
  testAssignment.assignedBy,
  testAssignment.pickupLat,
  testAssignment.pickupLng,
  testAssignment.pickupName,
  testAssignment.deliveryLat,
  testAssignment.deliveryLng,
  testAssignment.deliveryName
], (err) => {
  if (err) {
    console.error('Error creating test assignment:', err);
  } else {
    console.log('✅ Test assignment created successfully');
  }
  
  // Check the assignment
  db.all(`
    SELECT 
      a.id,
      a.orderId,
      a.driverId,
      d.name as driver_name,
      a.status,
      a.assignedAt
    FROM driver_assignments a
    LEFT JOIN drivers d ON a.driverId = d.id
    ORDER BY a.assignedAt DESC
  `, [], (err, assignments) => {
    console.log('\n📋 Current assignments:');
    assignments.forEach(a => {
      console.log(`Order: ${a.orderId} | Driver: ${a.driver_name} | Status: ${a.status} | Assigned: ${a.assignedAt}`);
    });
    
    db.close();
  });
});