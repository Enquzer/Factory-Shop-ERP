import { Database } from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Database instance
let db: any = null;

// Initialize database connection
export async function initializeDB() {
  if (db) return db;

  try {
    // Open database file
    db = await open({
      filename: path.join(process.cwd(), 'db', 'carement.db'),
      driver: require('sqlite3').Database
    });

    console.log('Database connected successfully');
    
    // Only run initial setup if this is the first time
    // Skip setup to avoid the orderNumber error
    // await setupDatabaseSchema();
    
    return db;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Get database instance
export async function getDB() {
  if (!db) {
    await initializeDB();
  }
  return db;
}

// Alias for compatibility
export { getDB as getDb };

// Reset database cache
export function resetDbCache() {
  db = null;
}

// Setup initial database schema
async function setupDatabaseSchema() {
  const db = await getDB();

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      profilePictureUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ownerName TEXT NOT NULL,
      phoneNumber TEXT,
      address TEXT,
      telegram_channel_id TEXT,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      basePrice REAL,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopId INTEGER,
      orderNumber TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending',
      totalAmount REAL,
      paymentStatus TEXT DEFAULT 'unpaid',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shopId) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      displayName TEXT NOT NULL,
      description TEXT,
      permissions TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT,
      assignedBy INTEGER,
      assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (assignedBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS telegram_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chatId TEXT UNIQUE NOT NULL,
      chatTitle TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      isActive BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shop_telegram_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopId INTEGER,
      messageId TEXT,
      channelId TEXT,
      messageText TEXT,
      messageType TEXT,
      sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      deliveryStatus TEXT DEFAULT 'pending',
      FOREIGN KEY (shopId) REFERENCES shops(id)
    );

    CREATE TABLE IF NOT EXISTS patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      parent_pattern_id INTEGER,
      data TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_pattern_id) REFERENCES patterns(id)
    );
  `);

  // Create indexes
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_shops_telegram ON shops(telegram_channel_id);
    CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shopId);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(orderNumber);
  `);

  // Insert default data
  await insertDefaultData();
}

// Insert default data
async function insertDefaultData() {
  const db = await getDB();

  // Check if default admin exists
  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  
  if (!adminExists) {
    // Insert default admin user (password: admin123)
    await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', 'admin']
    );
    console.log('Default admin user created');
  }

  // Insert default roles
  const roles = [
    { name: 'factory', displayName: 'Factory Admin', description: 'Factory administrator with full factory access', permissions: '{"dashboard":true,"products":true,"orders":true,"inventory":true,"reports":true}' },
    { name: 'shop', displayName: 'Shop Owner', description: 'Shop owner with shop management access', permissions: '{"dashboard":true,"orders":true,"inventory":true,"reports":true}' },
    { name: 'store', displayName: 'Store Keeper', description: 'Store management access', permissions: '{"dashboard":true,"inventory":true,"materials":true}' },
    { name: 'finance', displayName: 'Finance Manager', description: 'Financial operations access', permissions: '{"dashboard":true,"orders":true,"payments":true,"reports":true}' },
    { name: 'planning', displayName: 'Planning Department', description: 'Production planning access', permissions: '{"dashboard":true,"planning":true,"reports":true}' },
    { name: 'cutting', displayName: 'Cutting Department', description: 'Cutting department access', permissions: '{"dashboard":true,"cutting":true,"reports":true}' },
    { name: 'sewing', displayName: 'Sewing Department', description: 'Sewing department access', permissions: '{"dashboard":true,"sewing":true,"reports":true}' },
    { name: 'finishing', displayName: 'Finishing Department', description: 'Finishing department access', permissions: '{"dashboard":true,"finishing":true,"reports":true}' },
    { name: 'packing', displayName: 'Packing Department', description: 'Packing department access', permissions: '{"dashboard":true,"packing":true,"reports":true}' },
    { name: 'quality_inspection', displayName: 'Quality Control', description: 'Quality inspection access', permissions: '{"dashboard":true,"qc":true,"reports":true}' },
    { name: 'marketing', displayName: 'Marketing Department', description: 'Marketing operations access', permissions: '{"dashboard":true,"marketing":true,"reports":true}' },
    { name: 'designer', displayName: 'Designer', description: 'Designer studio access', permissions: '{"dashboard":true,"design":true,"reports":true}' },
    { name: 'hr', displayName: 'HR Manager', description: 'HR and Incentive management access', permissions: '{"dashboard":true,"hr":true,"reports":true}' },
    { name: 'admin', displayName: 'System Administrator', description: 'Full system administrator', permissions: '{"dashboard":true,"users":true,"products":true,"orders":true,"inventory":true,"reports":true,"settings":true}' }
  ];

  for (const role of roles) {
    await db.run(
      'INSERT OR IGNORE INTO roles (name, displayName, description, permissions) VALUES (?, ?, ?, ?)',
      [role.name, role.displayName, role.description, role.permissions]
    );
  }

  console.log('Default roles created');
}

// Database utility functions
export const dbUtils = {
  // User operations
  async getUserByUsername(username: string) {
    const db = await getDB();
    return await db.get('SELECT * FROM users WHERE username = ?', [username]);
  },

  async getUserById(id: number) {
    const db = await getDB();
    return await db.get('SELECT * FROM users WHERE id = ?', [id]);
  },

  async createUser(username: string, password: string, role: string) {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]
    );
    return result.lastID;
  },

  // Shop operations
  async getShops() {
    const db = await getDB();
    return await db.all('SELECT * FROM shops WHERE isActive = 1');
  },

  async getShopById(id: number) {
    const db = await getDB();
    return await db.get('SELECT * FROM shops WHERE id = ? AND isActive = 1', [id]);
  },

  async createShop(name: string, ownerName: string, phoneNumber: string, address: string) {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO shops (name, ownerName, phoneNumber, address) VALUES (?, ?, ?, ?)',
      [name, ownerName, phoneNumber, address]
    );
    return result.lastID;
  },

  async updateShopTelegramChannel(shopId: number, channelId: string) {
    const db = await getDB();
    return await db.run(
      'UPDATE shops SET telegram_channel_id = ? WHERE id = ?',
      [channelId, shopId]
    );
  },

  // Order operations
  async getOrders() {
    const db = await getDB();
    return await db.all(`
      SELECT o.*, s.name as shopName 
      FROM orders o 
      LEFT JOIN shops s ON o.shopId = s.id 
      ORDER BY o.createdAt DESC
    `);
  },

  async getOrderById(id: number) {
    const db = await getDB();
    return await db.get(`
      SELECT o.*, s.name as shopName, s.telegram_channel_id
      FROM orders o
      LEFT JOIN shops s ON o.shopId = s.id
      WHERE o.id = ?
    `, [id]);
  },

  async createOrder(shopId: number, orderNumber: string, totalAmount: number) {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO orders (shopId, orderNumber, totalAmount) VALUES (?, ?, ?)',
      [shopId, orderNumber, totalAmount]
    );
    return result.lastID;
  },

  // Role operations
  async getRoleByName(name: string) {
    const db = await getDB();
    return await db.get('SELECT * FROM roles WHERE name = ?', [name]);
  },

  async getUserRoles(userId: number) {
    const db = await getDB();
    return await db.all(`
      SELECT ur.*, r.displayName, r.permissions
      FROM user_roles ur
      JOIN roles r ON ur.role = r.name
      WHERE ur.userId = ?
    `, [userId]);
  },

  // Telegram operations
  async saveTelegramGroup(chatId: string, chatTitle: string) {
    const db = await getDB();
    const result = await db.run(
      'INSERT OR IGNORE INTO telegram_groups (chatId, chatTitle) VALUES (?, ?)',
      [chatId, chatTitle]
    );
    return result.lastID;
  },

  async getTelegramGroups() {
    const db = await getDB();
    return await db.all('SELECT * FROM telegram_groups WHERE isActive = 1');
  },

  async logTelegramNotification(shopId: number, messageId: string, channelId: string, messageText: string, messageType: string) {
    const db = await getDB();
    const result = await db.run(
      'INSERT INTO shop_telegram_notifications (shopId, messageId, channelId, messageText, messageType) VALUES (?, ?, ?, ?, ?)',
      [shopId, messageId, channelId, messageText, messageType]
    );
    return result.lastID;
  }
};

export default dbUtils;