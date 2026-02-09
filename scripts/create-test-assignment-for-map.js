const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

console.log('📦 Creating test assignment for map display...\n');

// Create a test assignment for Motor1
const testAssignment = {
  driverId: '1',
  orderId: 'MAP-TEST-001',
  assignedBy: 'system',
  pickupLat: 9.02,      // Slightly different from driver location
  pickupLng: 38.74,
  pickupName: 'Test Shop Location',
  deliveryLat: 9.04,    // Different from both
  deliveryLng: 38.76,
  deliveryName: 'Test Customer Address',
  status: 'assigned'
};

console.log('Creating test assignment:');
console.log(`   Order ID: ${testAssignment.orderId}`);
console.log(`   Driver ID: ${testAssignment.driverId}`);
console.log(`   Pickup: ${testAssignment.pickupName} (${testAssignment.pickupLat}, ${testAssignment.pickupLng})`);
console.log(`   Delivery: ${testAssignment.deliveryName} (${testAssignment.deliveryLat}, ${testAssignment.deliveryLng})`);

db.run(`
  INSERT INTO driver_assignments (
    driverId, orderId, assignedBy,
    pickupLat, pickupLng, pickupName,
    deliveryLat, deliveryLng, deliveryName,
    status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  testAssignment.driverId,
  testAssignment.orderId,
  testAssignment.assignedBy,
  testAssignment.pickupLat,
  testAssignment.pickupLng,
  testAssignment.pickupName,
  testAssignment.deliveryLat,
  testAssignment.deliveryLng,
  testAssignment.deliveryName,
  testAssignment.status
], function(err) {
  if (err) {
    console.error('❌ Error creating test assignment:', err);
  } else {
    console.log(`✅ Test assignment created successfully (ID: ${this.lastID})`);
    
    console.log('\n📋 Current assignments for Motor1:');
    db.all(`
      SELECT id, orderId, status, assignedAt 
      FROM driver_assignments 
      WHERE driverId = '1' 
      ORDER BY assignedAt DESC
    `, [], (err, assignments) => {
      if (err) {
        console.error('Error fetching assignments:', err);
      } else {
        assignments.forEach(a => {
          console.log(`   - Order: ${a.orderId} | Status: ${a.status} | Assigned: ${a.assignedAt}`);
        });
      }
      
      console.log('\n🚀 Map setup complete!');
      console.log('   Driver location: Set (9.03, 38.75)');
      console.log('   Test assignment: Created');
      console.log('   Visit: https://localhost:3000/driver/dashboard');
      console.log('   You should see:');
      console.log('   - Blue driver marker at current location');
      console.log('   - Green shop marker at pickup location');
      console.log('   - Red delivery marker at destination');
      console.log('   - Route line connecting all points');
      
      db.close();
    });
  }
});