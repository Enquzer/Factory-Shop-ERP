const sqlite3 = require('sqlite3').verbose();

// Connect to database
const db = new sqlite3.Database('./factory-shop.sqlite', (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
});

console.log('🔍 Checking current driver assignment system state...\n');

// Check drivers table
db.all(`SELECT id, name, vehicleType, status FROM drivers ORDER BY name`, [], (err, drivers) => {
  if (err) {
    console.error('Error querying drivers:', err);
    db.close();
    return;
  }
  
  console.log('🚗 DRIVERS TABLE:');
  console.log('==================');
  drivers.forEach(driver => {
    console.log(`ID: ${driver.id} | Name: ${driver.name} | Vehicle: ${driver.vehicleType} | Status: ${driver.status}`);
  });
  
  console.log('\n📋 ASSIGNMENTS TABLE:');
  console.log('=====================');
  
  // Check assignments
  db.all(`
    SELECT 
      a.id,
      a.orderId,
      a.driverId,
      d.name as driver_name,
      a.status,
      a.assignedAt,
      a.actualDeliveryTime as completed_at
    FROM driver_assignments a
    LEFT JOIN drivers d ON a.driverId = d.id
    ORDER BY a.assignedAt DESC
    LIMIT 10
  `, [], (err, assignments) => {
    if (err) {
      console.error('Error querying assignments:', err);
      db.close();
      return;
    }
    
    if (assignments.length === 0) {
      console.log('No assignments found');
    } else {
      assignments.forEach(assignment => {
        console.log(`Order: ${assignment.orderId} | Driver: ${assignment.driver_name} (${assignment.driverId})`);
        console.log(`   Status: ${assignment.status} | Assigned: ${assignment.assignedAt}`);
        if (assignment.completed_at) {
          console.log(`   Completed: ${assignment.completed_at}`);
        }
      });
    }
    
    console.log('\n🔔 NOTIFICATIONS TABLE:');
    console.log('=======================');
    
    // Check notifications
    db.all(`
      SELECT 
        id,
        userType,
        title,
        description,
        isRead,
        created_at
      FROM notifications 
      WHERE userType = 'driver'
      ORDER BY created_at DESC
      LIMIT 5
    `, [], (err, notifications) => {
      if (err) {
        console.error('Error querying notifications:', err);
        db.close();
        return;
      }
      
      if (notifications.length === 0) {
        console.log('No driver notifications found');
      } else {
        notifications.forEach(notif => {
          const status = notif.isRead ? 'READ' : 'UNREAD';
          console.log(`${status} | ${notif.title}`);
          console.log(`   ${notif.description} (${notif.created_at})`);
        });
      }
      
      console.log('\n✅ System check completed!');
      db.close();
    });
  });
});