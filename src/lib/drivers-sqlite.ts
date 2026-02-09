import { getDB } from './db';
import { sendDriverAssignedNotification, sendOrderStatusUpdateNotification } from './notifications-driver';

export type Driver = {
  id: string;
  userId?: string; // Links to users table
  employeeId?: string; // Links to employees table
  name: string;
  phone: string;
  licensePlate: string;
  vehicleType: 'motorbike' | 'car' | 'van' | 'truck';
  status: 'available' | 'busy' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
    lastUpdated: Date;
  };
  assignedOrders: string[]; // Array of order IDs
  createdAt: Date;
  updatedAt: Date;
  jobCenter?: string;
  departmentName?: string;
  profilePicture?: string;
  username?: string;
  maxCapacity?: number;
  activeOrderCount?: number;
};

export type DriverAssignment = {
  id: string;
  driverId: string;
  orderId: string;
  assignedBy: string; // ecommerce manager username
  assignedAt: Date;
  status: 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickupLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  deliveryLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  estimatedDeliveryTime?: Date;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
};

// Initialize drivers tables
export async function initializeDriversTables() {
  try {
    const db = await getDB();
    
    // Create drivers table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        userId TEXT UNIQUE, -- Links to users table
        employeeId TEXT UNIQUE, -- Links to employees table
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        licensePlate TEXT NOT NULL UNIQUE,
        vehicleType TEXT NOT NULL CHECK(vehicleType IN ('motorbike', 'car', 'van', 'truck')),
        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'busy', 'offline')),
        currentLat REAL,
        currentLng REAL,
        locationLastUpdated DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Ensure columns exist (in case table was created with older schema)
    const driverCols = await db.all("PRAGMA table_info(drivers)");
    const driverColNames = driverCols.map((c: any) => c.name);
    
    if (!driverColNames.includes('updatedAt')) {
      await db.exec("ALTER TABLE drivers ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP");
    }
    if (!driverColNames.includes('currentLat')) {
      await db.exec("ALTER TABLE drivers ADD COLUMN currentLat REAL");
    }
    if (!driverColNames.includes('currentLng')) {
      await db.exec("ALTER TABLE drivers ADD COLUMN currentLng REAL");
    }
    if (!driverColNames.includes('locationLastUpdated')) {
      await db.exec("ALTER TABLE drivers ADD COLUMN locationLastUpdated DATETIME");
    }
    
    // Create driver_assignments table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS driver_assignments (
        id TEXT PRIMARY KEY,
        driverId TEXT NOT NULL,
        orderId TEXT NOT NULL,
        assignedBy TEXT NOT NULL,
        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
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
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE,
        FOREIGN KEY (orderId) REFERENCES ecommerce_orders(id) ON DELETE CASCADE
      )
    `);

    // Ensure columns exist for driver_assignments
    const assignCols = await db.all("PRAGMA table_info(driver_assignments)");
    const assignColNames = assignCols.map((c: any) => c.name);
    
    const requiredAssignCols = [
      { name: 'driverId', type: 'TEXT' },
      { name: 'orderId', type: 'TEXT' },
      { name: 'assignedBy', type: 'TEXT' },
      { name: 'assignedAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { name: 'pickupLat', type: 'REAL' },
      { name: 'pickupLng', type: 'REAL' },
      { name: 'pickupName', type: 'TEXT' },
      { name: 'deliveryLat', type: 'REAL' },
      { name: 'deliveryLng', type: 'REAL' },
      { name: 'deliveryName', type: 'TEXT' },
      { name: 'updatedAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of requiredAssignCols) {
      if (!assignColNames.includes(col.name)) {
        await db.exec(`ALTER TABLE driver_assignments ADD COLUMN ${col.name} ${col.type}`);
      }
    }
    
    // Create indexes for better performance
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driverId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_driver_assignments_order ON driver_assignments(orderId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_driver_assignments_status ON driver_assignments(status)`);
    
    console.log('Drivers tables initialized successfully');
  } catch (error) {
    console.error('Error initializing drivers tables:', error);
    throw error;
  }
}

// Driver CRUD Operations

export async function createDriver(driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'assignedOrders' | 'currentLocation'>): Promise<Driver> {
  try {
    const db = await getDB();
    // Generate a proper integer ID for the new driver
    const maxIdResult = await db.get('SELECT MAX(id) as maxId FROM drivers');
    const id = maxIdResult?.maxId ? maxIdResult.maxId + 1 : Math.floor(Date.now() / 1000);
    
    await db.run(`
      INSERT INTO drivers (id, userId, employeeId, name, phone, contact, licensePlate, vehicleType, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      driverData.userId,
      driverData.employeeId,
      driverData.name,
      driverData.phone,
      driverData.phone, // Use phone for contact as well
      driverData.licensePlate,
      driverData.vehicleType,
      driverData.status
    ]);
    
    return await getDriverById(id.toString());
  } catch (error) {
    console.error('Error creating driver:', error);
    throw error;
  }
}

export async function getDriverById(id: string): Promise<Driver> {
  try {
    const db = await getDB();
    // Try to find by id (DRV-xxx), userId, or employeeId in drivers table first
    // Also joining with users table to allow finding by username
    let driver = await db.get(`
      SELECT d.*, e.jobCenter, e.profilePicture, dept.name as departmentName, u.username
      FROM drivers d
      LEFT JOIN employees e ON d.employeeId = e.employeeId
      LEFT JOIN departments dept ON e.departmentId = dept.id
      LEFT JOIN users u ON d.userId = u.id
      WHERE d.id = ? OR d.userId = ? OR d.employeeId = ? OR u.username = ?
    `, [id, id, id, id]);
    
    // If not found in drivers table, try to find in employees table
    if (!driver) {
      // Find employee by employeeId OR name OR userId (linking to users table)
      const emp = await db.get(`
        SELECT e.*, dept.name as departmentName, u.username
        FROM employees e
        INNER JOIN departments dept ON e.departmentId = dept.id
        LEFT JOIN users u ON e.userId = u.id
        WHERE (e.employeeId = ? OR u.username = ? OR e.name = ?) 
        AND (dept.name = 'Drivers' OR dept.id = 11)
      `, [id, id, id]);
      
      if (emp) {
        driver = {
          id: emp.employeeId,
          employeeId: emp.employeeId,
          userId: emp.userId,
          name: emp.name,
          phone: emp.phone,
          status: 'available',
          createdAt: new Date(),
          updatedAt: new Date(),
          departmentName: emp.departmentName,
          profilePicture: emp.profilePicture,
          jobCenter: 'Driver',
          username: emp.username
        };
      }
    }

    if (!driver) {
      throw new Error('Driver not found');
    }
    
    // Get assigned orders
    // Smarter assignment lookup: check for driver.id (numeric), driver.userId, AND driver.employeeId
    const searchIds = [driver.id, id];
    if (driver.employeeId) searchIds.push(driver.employeeId);
    if (driver.userId) searchIds.push(driver.userId);
    
    // Construct placeholders for IN clause
    const placeholders = searchIds.map(() => '?').join(',');
    
    const assignments = await db.all(`
      SELECT orderId FROM driver_assignments 
      WHERE (driverId IN (${placeholders}) OR driver_id IN (${placeholders})) 
      AND status != 'delivered' AND status != 'cancelled'
    `, [...searchIds, ...searchIds]);
    
    const assignedOrders = assignments.map((a: any) => a.orderId || a.order_id);
    
    // Format current location
    let currentLocation = undefined;
    if (driver.currentLat && driver.currentLng && driver.locationLastUpdated) {
      currentLocation = {
        lat: driver.currentLat,
        lng: driver.currentLng,
        lastUpdated: new Date(driver.locationLastUpdated)
      };
    }
    
    // Get capacity limits from system settings
    let motorbikeLimit = 3;
    let carLimit = 5;
    let vanLimit = 10;
    let truckLimit = 20;
    try {
      const motorbikeSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_motorbike']);
      const carSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_car']);
      const vanSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_van']);
      const truckSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_truck']);
      if (motorbikeSetting) motorbikeLimit = parseInt(motorbikeSetting.value);
      if (carSetting) carLimit = parseInt(carSetting.value);
      if (vanSetting) vanLimit = parseInt(vanSetting.value);
      if (truckSetting) truckLimit = parseInt(truckSetting.value);
    } catch (e) {}

    const vType = (driver.vehicleType as any) || 'car';
    const maxCapacity = vType === 'motorbike' ? motorbikeLimit : 
                       vType === 'car' ? carLimit :
                       vType === 'van' ? vanLimit :
                       vType === 'truck' ? truckLimit : 1;
    
    return {
      id: driver.id || driver.employeeId,
      userId: driver.userId,
      employeeId: driver.employeeId,
      name: driver.name,
      phone: driver.phone,
      licensePlate: driver.licensePlate || driver.license_plate || 'N/A',
      vehicleType: vType,
      status: (driver.status as any) || 'available',
      currentLocation,
      assignedOrders,
      createdAt: driver.createdAt ? new Date(driver.createdAt) : new Date(),
      updatedAt: driver.updatedAt ? new Date(driver.updatedAt) : new Date(),
      jobCenter: driver.jobCenter || 'Driver',
      departmentName: driver.departmentName,
      profilePicture: driver.profilePicture,
      maxCapacity,
      activeOrderCount: assignedOrders.length
    };
  } catch (error) {
    console.error('Error fetching driver:', error);
    throw error;
  }
}

export async function getAllDrivers(): Promise<Driver[]> {
  try {
    const db = await getDB();
    
    // Fetch all employees in the 'Drivers' department and link with existing driver records
    console.log('[LIB] getAllDrivers: Starting query...');
    const drivers = await db.all(`
      SELECT 
        e.employeeId, 
        e.name, 
        e.phone, 
        e.profilePicture,
        d.id as driverId,
        d.userId,
        u.username,
        d.licensePlate,
        d.vehicleType,
        d.status,
        d.currentLat,
        d.currentLng,
        d.locationLastUpdated,
        dept.name as departmentName
      FROM employees e
      INNER JOIN departments dept ON e.departmentId = dept.id
      LEFT JOIN drivers d ON e.employeeId = d.employeeId
      LEFT JOIN users u ON d.userId = u.id
      WHERE dept.name = 'Drivers' OR dept.id = 11
      ORDER BY e.name
    `);
    
    console.log(`[LIB] getAllDrivers: Query returned ${drivers.length} raw records`);
    
    // Fetch capacity settings once
    let motorbikeLimit = 3;
    let carLimit = 5;
    let vanLimit = 10;
    let truckLimit = 20;
    try {
      const motorbikeSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_motorbike']);
      const carSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_car']);
      const vanSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_van']);
      const truckSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_truck']);
      if (motorbikeSetting) motorbikeLimit = parseInt(motorbikeSetting.value);
      if (carSetting) carLimit = parseInt(carSetting.value);
      if (vanSetting) vanLimit = parseInt(vanSetting.value);
      if (truckSetting) truckLimit = parseInt(truckSetting.value);
    } catch (e) {}

    const result = await Promise.all(drivers.map(async (driver: any) => {
      const actualDriverId = driver.employeeId; // Use employeeId as the main ID for consistent string usage
      
      // Get assigned orders count
      // We need to check against BOTH the driver table ID and the employee ID
      // because assignments might be linked via either
      const dbId = driver.driverId; // This comes from the main query 'd.id as driverId'
      const empId = driver.employeeId;
      
      let assignedOrders: string[] = [];
      let assignedOrdersCount = 0;
      try {
        const searchIds = [];
        if (dbId) searchIds.push(dbId);
        if (empId) searchIds.push(empId);
        
        if (searchIds.length > 0) {
            const placeholders = searchIds.map(() => '?').join(',');
            const allPlaceholders = [...searchIds, ...searchIds];
            
            const assignments = await db.all(`
              SELECT orderId FROM driver_assignments 
              WHERE (driverId IN (${placeholders}) OR driver_id IN (${placeholders})) 
              AND status NOT IN ('delivered', 'cancelled')
            `, allPlaceholders);
            
            assignedOrders = assignments.map((a: any) => String(a.orderId));
            assignedOrdersCount = assignedOrders.length;
        }
      } catch (assignmentError) {
        console.warn(`[LIB] Could not fetch assignments for driver ${empId}/${dbId}:`, assignmentError);
      }
      
      // Format current location
      let currentLocation = undefined;
      if (driver.currentLat && driver.currentLng && driver.locationLastUpdated) {
        currentLocation = {
          lat: driver.currentLat,
          lng: driver.currentLng,
          lastUpdated: new Date(driver.locationLastUpdated)
        };
      }
      
      const driverObj = {
        id: actualDriverId.toString(),
        userId: driver.userId?.toString(),
        username: driver.username || '',
        employeeId: driver.employeeId,
        name: driver.name || 'Unknown Driver',
        phone: driver.phone || '',
        licensePlate: driver.licensePlate || 'N/A',
        vehicleType: (driver.vehicleType as any) || 'car',
        status: (driver.status as any) || 'available',
        currentLocation,
        assignedOrders,
        createdAt: driver.createdAt ? new Date(driver.createdAt) : new Date(),
        updatedAt: driver.updatedAt ? new Date(driver.updatedAt) : new Date(),
        jobCenter: 'Driver',
        departmentName: driver.departmentName,
        profilePicture: driver.profilePicture,
        activeOrderCount: assignedOrdersCount,
        maxCapacity: driver.vehicleType === 'motorbike' ? motorbikeLimit : 
                    driver.vehicleType === 'car' ? carLimit :
                    driver.vehicleType === 'van' ? vanLimit :
                    driver.vehicleType === 'truck' ? truckLimit : 1
      };
      
      console.log(`[LIB] Processed driver ${actualDriverId}:`, {
        id: driverObj.id,
        name: driverObj.name,
        status: driverObj.status,
        vehicleType: driverObj.vehicleType
      });
      
      return driverObj;
    }));
    
    console.log(`[LIB] getAllDrivers: Returning ${result.length} drivers`);
    console.log('[LIB] getAllDrivers: Status breakdown:', result.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    
    return result;
  } catch (error) {
    console.error('Error fetching all drivers:', error);
    return [];
  }
}

export async function updateDriver(id: string, updateData: Partial<Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'assignedOrders'>>): Promise<boolean> {
  try {
    // console.log('updateDriver called with id:', id, 'and updateData:', JSON.stringify(updateData, null, 2));
    await initializeDriversTables(); // Ensure tables exist
    const db = await getDB();
    
    // Check if driver exists in drivers table (need to match how getDriverById finds records)
    // getDriverById looks by d.id = ? OR d.userId = ? OR d.employeeId = ? OR u.username = ?
    // So we need to find the same record that getDriverById would find
    const existing = await db.get(`
      SELECT d.id FROM drivers d
      LEFT JOIN users u ON d.userId = u.id
      WHERE d.id = ? OR d.userId = ? OR d.employeeId = ? OR u.username = ?
    `, [id, id, id, id]);
    // console.log('Existing driver check result:', existing);
    
    let actualDbId = id;

    if (!existing) {
      // If not in drivers, try to find employee by employeeId, name, or userId
      const emp = await db.get(`
        SELECT e.* FROM employees e 
        JOIN departments dept ON e.departmentId = dept.id 
        LEFT JOIN users u ON e.userId = u.id
        WHERE (e.employeeId = ? OR u.username = ? OR e.name = ?) 
        AND (dept.name = 'Drivers' OR dept.id = 11)
      `, [id, id, id]);
      // console.log('Employee lookup result:', emp);
      
      if (emp) {
        // Create the driver record with a proper INTEGER ID
        const maxIdResult = await db.get('SELECT MAX(id) as maxId FROM drivers');
        const newId = maxIdResult?.maxId ? maxIdResult.maxId + 1 : Math.floor(Date.now() / 1000);
        actualDbId = newId.toString();
        
        // console.log('Creating new driver record with INTEGER ID:', newId);
        await db.run(`
          INSERT INTO drivers (id, name, phone, contact, licensePlate, vehicleType, status, employeeId, userId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          Number(newId),           // INTEGER ID
          String(emp.name), 
          String(emp.phone), 
          String(emp.phone),       // Use phone for contact as well
          `AUTO-${Date.now()}`, 
          'car', 
          updateData.status || 'available',
          String(emp.employeeId),
          emp.userId ? String(emp.userId) : null
        ]);
        // console.log('New driver record created successfully from employee with ID:', newId);
      } else {
        // If no employee found, create a basic driver record using the ID as the username
        // This handles cases where a driver account exists but doesn't have an employee record
        // console.log('No employee found, creating basic driver record with ID:', id);
        
        // Generate a proper integer ID for the new driver record
        // Get the max existing ID and increment, or use timestamp if no records exist
        const maxIdResult = await db.get('SELECT MAX(id) as maxId FROM drivers');
        const newId = maxIdResult?.maxId ? maxIdResult.maxId + 1 : Math.floor(Date.now() / 1000);
        
        // Ensure all values are properly typed to avoid datatype mismatches
        const driverName = typeof id === 'string' ? `Driver ${id}` : `Driver ${String(id)}`;
        const driverPhone = 'N/A';
        const driverContact = 'N/A'; // Required NOT NULL field
        const driverLicensePlate = `DRV-${Date.now()}`;
        const driverVehicleType = 'car';
        const driverStatus = updateData.status || 'available';
        const driverUserId = String(id);
        
        // console.log('Inserting new driver with values:', {
        //   id: newId,
        //   name: driverName,
        //   phone: driverPhone,
        //   contact: driverContact,
        //   licensePlate: driverLicensePlate,
        //   vehicleType: driverVehicleType,
        //   status: driverStatus,
        //   userId: driverUserId
        // });
        
        await db.run(`
          INSERT INTO drivers (id, name, phone, contact, licensePlate, vehicleType, status, userId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          Number(newId),        // Ensure integer ID
          String(driverName),   // Ensure string name
          String(driverPhone),  // Ensure string phone
          String(driverContact), // Ensure string contact (NOT NULL)
          String(driverLicensePlate), // Ensure string licensePlate
          String(driverVehicleType),  // Ensure string vehicleType
          String(driverStatus), // Ensure string status
          String(driverUserId)  // Ensure string userId
        ]);
        actualDbId = newId.toString();
        // console.log('Basic driver record created successfully with generated ID:', newId, 'for user:', id);
      }
    } else {
      actualDbId = existing.id.toString();
      // console.log('Using existing driver ID:', actualDbId);
    }

    const fields = [];
    const values = [];
    
    if (updateData.name !== undefined) {
      fields.push('name = ?');
      values.push(String(updateData.name));
    }
    if (updateData.phone !== undefined) {
      fields.push('phone = ?');
      values.push(String(updateData.phone));
    }
    if (updateData.licensePlate !== undefined) {
      fields.push('licensePlate = ?');
      values.push(String(updateData.licensePlate));
    }
    if (updateData.vehicleType !== undefined) {
      fields.push('vehicleType = ?');
      values.push(String(updateData.vehicleType));
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      values.push(String(updateData.status));
    }
    if (updateData.currentLocation !== undefined) {
      fields.push('currentLat = ?, currentLng = ?, locationLastUpdated = ?');
      // console.log('Processing currentLocation:', updateData.currentLocation);
      const lastUpdated = updateData.currentLocation.lastUpdated instanceof Date 
        ? updateData.currentLocation.lastUpdated 
        : new Date(updateData.currentLocation.lastUpdated);
      // console.log('Processed lastUpdated:', lastUpdated);
      values.push(
        Number(updateData.currentLocation.lat),
        Number(updateData.currentLocation.lng),
        lastUpdated.toISOString()
      );
      // console.log('Added location values to update:', updateData.currentLocation.lat, updateData.currentLocation.lng, lastUpdated.toISOString());
    }
    
    if (fields.length === 0) {
      // console.log('No fields to update, returning true');
      return true;
    }
    
    values.push(Number(actualDbId)); // Ensure ID is integer for WHERE clause
    // console.log('Final update query:', `UPDATE drivers SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    // console.log('Final values:', values);
    // console.log('Updating driver with ID:', actualDbId, '(converted to number:', Number(actualDbId), ')');
    
    await db.run(`
      UPDATE drivers SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `, values);
    // console.log('Update query executed successfully');
    
    return true;
  } catch (error) {
    // console.error('Error updating driver:', error);
    return false;
  }
}

export async function deleteDriver(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`DELETE FROM drivers WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting driver:', error);
    return false;
  }
}

// Driver Assignment Operations

export async function assignOrderToDriver(driverId: string, orderId: string, assignedBy: string, pickupLocation: { lat: number; lng: number; name: string }, deliveryLocation: { lat: number; lng: number; name: string }): Promise<DriverAssignment> {
  try {
    console.log('[DRIVER ASSIGN] Called with:', { driverId, orderId, assignedBy });
    console.log('[DRIVER ASSIGN] Order ID type:', typeof orderId, 'value:', orderId);
    
    const db = await getDB();
    // Generate a proper integer ID for the assignment
    const maxIdResult = await db.get('SELECT MAX(id) as maxId FROM driver_assignments');
    const id = maxIdResult?.maxId ? maxIdResult.maxId + 1 : Math.floor(Date.now() / 1000);
    
    console.log('[DRIVER ASSIGN] Generated assignment ID:', id);
    
    // REASSIGNMENT LOGIC: Cancel any existing active assignments for this order
    console.log('[DRIVER ASSIGN] Checking for existing active assignments for order:', orderId);
    const existingActiveAssignments = await db.all(`
      SELECT id, driverId, driver_id FROM driver_assignments 
      WHERE orderId = ? OR order_id = ? 
      AND status NOT IN ('delivered', 'cancelled')
    `, [orderId, orderId]);
    
    if (existingActiveAssignments.length > 0) {
      console.log(`[DRIVER ASSIGN] Found ${existingActiveAssignments.length} existing active assignments. Cancelling them...`);
      for (const old of existingActiveAssignments) {
        await db.run(`
          UPDATE driver_assignments SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [old.id]);
        
        // Also potentially free up the old driver status if they have no other orders
        const oldDriverId = old.driverId || old.driver_id;
        if (oldDriverId) {
          const otherOrders = await db.get(`
            SELECT COUNT(*) as count FROM driver_assignments 
            WHERE (driverId = ? OR driver_id = ?) 
            AND status NOT IN ('delivered', 'cancelled')
          `, [oldDriverId, oldDriverId]);
          
          if (!otherOrders || otherOrders.count === 0) {
            await db.run('UPDATE drivers SET status = ? WHERE id = ? OR employeeId = ?', ['available', oldDriverId, oldDriverId]);
          }
        }
      }
    }
    
    // Check if driver already has active assignments
    // Use expanded check for driver IDs
    const currentDriver = await getDriverById(driverId);
    const searchIds = [driverId];
    if (currentDriver.employeeId) searchIds.push(currentDriver.employeeId);
    if (currentDriver.id) searchIds.push(currentDriver.id.toString());
    
    const placeholders = searchIds.map(() => '?').join(',');
    const activeAssignments = await db.all(`
      SELECT COUNT(*) as count FROM driver_assignments 
      WHERE (driverId IN (${placeholders}) OR driver_id IN (${placeholders})) 
      AND status != 'delivered' AND status != 'cancelled'
    `, [...searchIds, ...searchIds]);
    
    const activeCount = activeAssignments[0]?.count || 0;
    
    // Get driver info to check vehicle type
    const driver = await getDriverById(driverId);
    
    // Get dynamic capacity limits from system settings
    let motorbikeLimit = 3;
    let carLimit = 5;
    let vanLimit = 10;
    let truckLimit = 20;

    try {
      const motorbikeSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_motorbike']);
      const carSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_car']);
      const vanSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_van']);
      const truckSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_truck']);

      if (motorbikeSetting) motorbikeLimit = parseInt(motorbikeSetting.value);
      if (carSetting) carLimit = parseInt(carSetting.value);
      if (vanSetting) vanLimit = parseInt(vanSetting.value);
      if (truckSetting) truckLimit = parseInt(truckSetting.value);
    } catch (e) {
      console.warn('Could not fetch custom capacity settings, using defaults');
    }
    
    // Set capacity limits based on vehicle type
    let maxOrders = 1; // Default limit
    if (driver.vehicleType === 'motorbike') {
      maxOrders = motorbikeLimit;
    } else if (driver.vehicleType === 'car') {
      maxOrders = carLimit;
    } else if (driver.vehicleType === 'van') {
      maxOrders = vanLimit;
    } else if (driver.vehicleType === 'truck') {
      maxOrders = truckLimit;
    }
    
    console.log(`[MULTI-ORDER] Driver ${driverId} (${driver.vehicleType}) has ${activeCount} active orders, max allowed: ${maxOrders}`);
    
    // Check if driver can accept more orders
    if (activeCount >= maxOrders) {
      throw new Error(`Driver ${driver.name} (${driver.vehicleType}) already has maximum allowed orders (${maxOrders}). Current active orders: ${activeCount}`);
    }
    
    console.log('[DRIVER ASSIGN] About to insert with values:', {
      id: id,
      driver_id: driverId,
      order_id: orderId,
      assignedBy: assignedBy
    });
    
    await db.run(`
      INSERT INTO driver_assignments (
        id, 
        driverId, orderId, assignedBy, 
        driver_id, order_id, assigned_by,
        pickupLat, pickupLng, pickupName,
        deliveryLat, deliveryLng, deliveryName,
        status, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id, 
      driverId, orderId, assignedBy,
      driverId, orderId, assignedBy,
      pickupLocation.lat, pickupLocation.lng, pickupLocation.name,
      deliveryLocation.lat, deliveryLocation.lng, deliveryLocation.name
    ]);
    
    console.log('[DRIVER ASSIGN] Insert successful');
    
    // Set driver status based on capacity
    if (activeCount + 1 >= maxOrders) {
      // Driver is at or exceeding capacity
      await updateDriver(driverId, { status: 'busy' });
      console.log(`[MULTI-ORDER] Driver ${driverId} reached capacity (${activeCount + 1}/${maxOrders}), setting status to busy`);
    } else {
      // Driver still has capacity available
      await updateDriver(driverId, { status: 'available' });
      console.log(`[MULTI-ORDER] Driver ${driverId} has capacity (${activeCount + 1}/${maxOrders}), setting status to available`);
    }
    
    // Send notification to customer
    await sendDriverAssignedNotification(orderId, driver.name, driver.phone);
    
    return await getDriverAssignmentById(id.toString());
  } catch (error) {
    console.error('Error assigning order to driver:', error);
    throw error;
  }
}

export async function getDriverAssignmentById(id: string): Promise<DriverAssignment> {
  try {
    const db = await getDB();
    // Handle both string and numeric IDs
    const assignment = await db.get(`
      SELECT * FROM driver_assignments WHERE id = ? OR id = ?
    `, [id, parseInt(id)]);
    
    if (!assignment) {
      throw new Error('Driver assignment not found');
    }
    
    return {
      id: assignment.id.toString(),
      driverId: (assignment.driverId || assignment.driver_id)?.toString(),
      orderId: assignment.orderId || assignment.order_id,
      assignedBy: assignment.assignedBy || assignment.assigned_by,
      assignedAt: new Date(assignment.assignedAt || assignment.assigned_at || Date.now()),
      status: (assignment.status?.toLowerCase() === 'active' ? 'accepted' : assignment.status?.toLowerCase()) as 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled',
      pickupLocation: (assignment.pickupLat || assignment.pickup_lat) && (assignment.pickupLng || assignment.pickup_lng) ? {
        lat: assignment.pickupLat || assignment.pickup_lat,
        lng: assignment.pickupLng || assignment.pickup_lng,
        name: assignment.pickupName || assignment.pickup_location_name || assignment.pickup_name
      } : undefined,
      deliveryLocation: (assignment.deliveryLat || assignment.delivery_lat) && (assignment.deliveryLng || assignment.delivery_lng) ? {
        lat: assignment.deliveryLat || assignment.delivery_lat,
        lng: assignment.deliveryLng || assignment.delivery_lng,
        name: assignment.deliveryName || assignment.delivery_location_name || assignment.delivery_name
      } : undefined,
      estimatedDeliveryTime: (assignment.estimatedDeliveryTime || assignment.estimated_delivery_time) ? new Date(assignment.estimatedDeliveryTime || assignment.estimated_delivery_time) : undefined,
      actualPickupTime: (assignment.actualPickupTime || assignment.actual_pickup_time) ? new Date(assignment.actualPickupTime || assignment.actual_pickup_time) : undefined,
      actualDeliveryTime: (assignment.actualDeliveryTime || assignment.actual_delivery_time) ? new Date(assignment.actualDeliveryTime || assignment.actual_delivery_time) : undefined
    };
  } catch (error) {
    console.error('Error fetching driver assignment:', error);
    throw error;
  }
}

export async function getDriverAssignments(driverId: string): Promise<DriverAssignment[]> {
  try {
    const db = await getDB();
    
    // Get full driver info to resolve all possible IDs
    const driver = await getDriverById(driverId);
    const searchIds = [driverId];
    if (driver.employeeId) searchIds.push(driver.employeeId);
    if (driver.id) searchIds.push(driver.id.toString());
    
    const placeholders = searchIds.map(() => '?').join(',');
    
    const assignments = await db.all(`
      SELECT * FROM driver_assignments 
      WHERE (driverId IN (${placeholders}) OR driver_id IN (${placeholders})) 
      ORDER BY assignedAt DESC
    `, [...searchIds, ...searchIds]);
    
    return assignments.map((assignment: any) => ({
      id: assignment.id.toString(),
      driverId: (assignment.driverId || assignment.driver_id)?.toString(),
      orderId: assignment.orderId || assignment.order_id,
      assignedBy: assignment.assignedBy || assignment.assigned_by,
      assignedAt: new Date(assignment.assignedAt || assignment.assigned_at || Date.now()),
      status: (assignment.status?.toLowerCase() === 'active' ? 'accepted' : assignment.status?.toLowerCase()) as 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled',
      pickupLocation: (assignment.pickupLat || assignment.pickup_lat) && (assignment.pickupLng || assignment.pickup_lng) ? {
        lat: assignment.pickupLat || assignment.pickup_lat,
        lng: assignment.pickupLng || assignment.pickup_lng,
        name: assignment.pickupName || assignment.pickup_location_name || assignment.pickup_name
      } : undefined,
      deliveryLocation: (assignment.deliveryLat || assignment.delivery_lat) && (assignment.deliveryLng || assignment.delivery_lng) ? {
        lat: assignment.deliveryLat || assignment.delivery_lat,
        lng: assignment.deliveryLng || assignment.delivery_lng,
        name: assignment.deliveryName || assignment.delivery_location_name || assignment.delivery_name
      } : undefined,
      estimatedDeliveryTime: (assignment.estimatedDeliveryTime || assignment.estimated_delivery_time) ? new Date(assignment.estimatedDeliveryTime || assignment.estimated_delivery_time) : undefined,
      actualPickupTime: (assignment.actualPickupTime || assignment.actual_pickup_time) ? new Date(assignment.actualPickupTime || assignment.actual_pickup_time) : undefined,
      actualDeliveryTime: (assignment.actualDeliveryTime || assignment.actual_delivery_time) ? new Date(assignment.actualDeliveryTime || assignment.actual_delivery_time) : undefined
    }));
  } catch (error) {
    console.error('Error fetching driver assignments:', error);
    return [];
  }
}

export async function updateAssignmentStatus(assignmentId: string, status: 'picked_up' | 'in_transit' | 'delivered' | 'cancelled', timestamp?: Date): Promise<boolean> {
  try {
    const db = await getDB();
    let query = `UPDATE driver_assignments SET status = ?, updatedAt = CURRENT_TIMESTAMP`;
    const values: any[] = [status];
    
    if (status === 'picked_up' && timestamp) {
      query += `, actualPickupTime = ?`;
      values.push(timestamp.toISOString());
    } else if (status === 'delivered' && timestamp) {
      query += `, actualDeliveryTime = ?`;
      values.push(timestamp.toISOString());
    }
    
    query += ` WHERE id = ?`;
    values.push(assignmentId);
    
    await db.run(query, values);
    
    // Send notification for status updates (except cancelled)
    if (status !== 'cancelled') {
      const assignment = await getDriverAssignmentById(assignmentId);
      const driver = await getDriverById(assignment.driverId);
      await sendOrderStatusUpdateNotification(assignment.orderId, status, driver.name);
      
      // Sync with order_dispatches table
      await db.run(`UPDATE order_dispatches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`, [status, assignment.orderId]);
    }
    
    // If order is delivered or cancelled, check driver capacity and update status accordingly
    if (status === 'delivered' || status === 'cancelled') {
      const assignment = await getDriverAssignmentById(assignmentId);
      
      console.log(`[MULTI-ORDER AVAILABILITY] Processing status change to ${status} for driver ${assignment.driverId}`);
      
      // Count active assignments (excluding delivered/cancelled ones)
      const activeAssignments = await db.all(`
        SELECT COUNT(*) as count FROM driver_assignments 
        WHERE (driverId = ? OR driver_id = ?) AND status != 'delivered' AND status != 'cancelled'
      `, [assignment.driverId, assignment.driverId]);
      
      console.log(`[MULTI-ORDER AVAILABILITY] Active assignments count: ${activeAssignments[0].count}`);
      
      // Get driver info to check vehicle type and capacity
      const driver = await getDriverById(assignment.driverId);
      
      // Get dynamic capacity limits
      let motorbikeLimit = 3;
      let carLimit = 5;
      let vanLimit = 10;
      let truckLimit = 20;

      try {
        const motorbikeSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_motorbike']);
        const carSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_car']);
        const vanSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_van']);
        const truckSetting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['capacity_limit_truck']);
        if (motorbikeSetting) motorbikeLimit = parseInt(motorbikeSetting.value);
        if (carSetting) carLimit = parseInt(carSetting.value);
        if (vanSetting) vanLimit = parseInt(vanSetting.value);
        if (truckSetting) truckLimit = parseInt(truckSetting.value);
      } catch (e) {}

      // Set capacity limits based on vehicle type
      let maxOrders = 1; // Default limit
      if (driver.vehicleType === 'motorbike') {
        maxOrders = motorbikeLimit;
      } else if (driver.vehicleType === 'car') {
        maxOrders = carLimit;
      } else if (driver.vehicleType === 'van') {
        maxOrders = vanLimit;
      } else if (driver.vehicleType === 'truck') {
        maxOrders = truckLimit;
      }
      
      // Make driver available if they're below capacity
      try {
        if (activeAssignments[0].count < maxOrders) {
          await updateDriver(assignment.driverId, { status: 'available' });
          console.log(`[MULTI-ORDER AVAILABILITY] Driver ${assignment.driverId} (${driver.vehicleType}) set to available. Active: ${activeAssignments[0].count}/${maxOrders}`);
        } else {
          await updateDriver(assignment.driverId, { status: 'busy' });
          console.log(`[MULTI-ORDER AVAILABILITY] Driver ${assignment.driverId} (${driver.vehicleType}) remains busy. Active: ${activeAssignments[0].count}/${maxOrders}`);
        }
      } catch (updateError) {
        console.error(`[MULTI-ORDER AVAILABILITY] Failed to update driver status:`, updateError);
      }
      
      console.log(`[MULTI-ORDER AVAILABILITY] Driver ${assignment.driverId} processed ${status} status. Active assignments: ${activeAssignments[0].count}/${maxOrders}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating assignment status:', error);
    return false;
  }
}

export async function getAvailableDrivers(): Promise<Driver[]> {
  try {
    const allDrivers = await getAllDrivers();
    return allDrivers.filter(d => d.status === 'available');
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    return [];
  }
}