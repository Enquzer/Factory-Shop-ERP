import { getDB } from '@/lib/db';

// Driver role permissions - limited access focused on delivery operations
const DRIVER_ROLE_PERMISSIONS = {
  dashboard: false,
  driver: true,        // Driver-specific dashboard and tracking
  orders: false,       // Cannot manage general orders
  products: false,     // Cannot manage products
  inventory: false,    // Cannot manage general inventory
  customers: false,    // Cannot manage customer accounts
  hr: false,           // Cannot access HR functions
  reports: false,      // Cannot view general reports
  settings: false,     // Cannot change system settings
  notifications: true, // Can receive notifications
  tracking: true,      // Can track deliveries
  location: true,      // Can update location
  profile: true        // Can manage their own profile
};

export async function initializeDriverRole() {
  try {
    const db = await getDB();
    
    // Create or update driver role with proper permissions
    await db.run(`
      INSERT OR REPLACE INTO roles (name, displayName, description, permissions) 
      VALUES (?, ?, ?, ?)
    `, [
      'driver',
      'Driver',
      'Delivery driver with access to order tracking and delivery management',
      JSON.stringify(DRIVER_ROLE_PERMISSIONS)
    ]);
    
    console.log('Driver role initialized with permissions');
    
    // Verify the role exists
    const driverRole = await db.get('SELECT * FROM roles WHERE name = ?', ['driver']);
    if (driverRole) {
      console.log('Driver role created successfully:', {
        name: driverRole.name,
        displayName: driverRole.displayName,
        permissions: JSON.parse(driverRole.permissions)
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing driver role:', error);
    return false;
  }
}

// Function to create user with proper role permissions
export async function createUserWithRole(username: string, password: string, role: string = 'driver') {
  try {
    const db = await getDB();
    
    // First, ensure the role exists
    await initializeDriverRole();
    
    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Create user with role
    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]  // Note: password should be hashed before calling this
    );
    
    console.log(`User ${username} created with role ${role}`);
    return {
      success: true,
      userId: result.lastID,
      username,
      role
    };
  } catch (error) {
    console.error('Error creating user with role:', error);
    throw error;
  }
}