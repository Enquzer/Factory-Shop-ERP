const sqlite3 = require('sqlite3').verbose();

// Connect to the main database
const db = new sqlite3.Database('./factory-shop.sqlite', (err) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
});

console.log('🔧 Initializing driver assignment database tables...\n');

// Create drivers table
const createDriversTable = `
CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY,
  userId TEXT,
  employeeId TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  contact TEXT,
  licensePlate TEXT,
  vehicleType TEXT CHECK(vehicleType IN ('motorbike', 'car', 'van', 'truck')),
  status TEXT DEFAULT 'available' CHECK(status IN ('available', 'busy', 'offline')),
  currentLat REAL,
  currentLng REAL,
  locationLastUpdated DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// Create driver_assignments table
const createAssignmentsTable = `
CREATE TABLE IF NOT EXISTS driver_assignments (
  id INTEGER PRIMARY KEY,
  driverId TEXT,
  orderId TEXT,
  assignedBy TEXT,
  assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  pickupLat REAL,
  pickupLng REAL,
  pickupName TEXT,
  deliveryLat REAL,
  deliveryLng REAL,
  deliveryName TEXT,
  estimatedDeliveryTime DATETIME,
  actualPickupTime DATETIME,
  actualDeliveryTime DATETIME,
  notificationSent BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// Create notifications table
const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  userId TEXT,
  userType TEXT,
  shopId TEXT,
  type TEXT,
  title TEXT NOT NULL,
  message TEXT,
  description TEXT,
  orderId TEXT,
  href TEXT,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

// Create indexes for better performance
const createIndexes = [
  "CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status)",
  "CREATE INDEX IF NOT EXISTS idx_assignments_driver ON driver_assignments(driverId)",
  "CREATE INDEX IF NOT EXISTS idx_assignments_order ON driver_assignments(orderId)",
  "CREATE INDEX IF NOT EXISTS idx_assignments_status ON driver_assignments(status)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(userId, isRead) WHERE isRead = 0"
];

// Execute all creation statements
db.serialize(() => {
  // Create tables
  db.run(createDriversTable, (err) => {
    if (err) {
      console.error('Error creating drivers table:', err);
    } else {
      console.log('✅ Drivers table created');
    }
  });

  db.run(createAssignmentsTable, (err) => {
    if (err) {
      console.error('Error creating driver_assignments table:', err);
    } else {
      console.log('✅ Driver assignments table created');
    }
  });

  db.run(createNotificationsTable, (err) => {
    if (err) {
      console.error('Error creating notifications table:', err);
    } else {
      console.log('✅ Notifications table created');
    }
  });

  // Create indexes
  createIndexes.forEach((indexSql, i) => {
    db.run(indexSql, (err) => {
      if (err) {
        console.error(`Error creating index ${i + 1}:`, err);
      } else {
        console.log(`✅ Index ${i + 1} created`);
      }
    });
  });

  // Add sample driver data
  const sampleDrivers = [
    ['Motor1', 'Motor Bike 1', 'motorbike', 'available'],
    ['Car1', 'Car 1', 'car', 'available'],
    ['Van1', 'Van 1', 'van', 'available']
  ];

  sampleDrivers.forEach(([id, name, vehicleType, status]) => {
    db.run(
      `INSERT OR IGNORE INTO drivers (id, name, vehicleType, status, phone) VALUES (?, ?, ?, ?, '123-456-7890')`,
      [id, name, vehicleType, status],
      (err) => {
        if (err) {
          console.error(`Error inserting driver ${name}:`, err);
        } else {
          console.log(`✅ Sample driver ${name} inserted`);
        }
      }
    );
  });

  // Close database when all operations are complete
  setTimeout(() => {
    console.log('\n🎉 Database initialization completed!');
    console.log('\n📋 Summary:');
    console.log('- Drivers table: Ready for driver management');
    console.log('- Assignments table: Ready for order assignments');
    console.log('- Notifications table: Ready for driver notifications');
    console.log('- Sample drivers: Added for testing (Motor1, Car1, Van1)');
    db.close();
  }, 1000);
});