// Only import database modules on the server side
let sqlite3: any;
let open: any;
let Database: any;
let path: any;
let fs: any;

// Database instance cache
let dbInstance: any = null;

if (typeof window === 'undefined') {
  // These imports are only available on the server side
  sqlite3 = require('sqlite3');
  const sqlite = require('sqlite');
  open = sqlite.open;
  Database = sqlite.Database;
  path = require('path');
  fs = require('fs');
}

export const getDb = async () => {
  // Only initialize database on the server side
  if (typeof window !== 'undefined') {
    throw new Error('Database operations are only available on the server side');
  }
  
  // Return cached database instance if available
  if (dbInstance) {
    return dbInstance;
  }
  
  // Ensure the db directory exists
  const dbDir = path.join(process.cwd(), 'db');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create or connect to the SQLite database
  const dbPath = path.join(dbDir, 'carement.db');
  
  const newDb = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // Initialize the database tables (only needs to be done once)
  await initializeDatabase(newDb);
  
  // Cache the database instance
  dbInstance = newDb;
  
  return newDb;
};

// Initialize the database tables
export const initializeDatabase = async (database: any) => {
  // Only run on the server side
  if (typeof window !== 'undefined') {
    return;
  }
  
  try {
    // Create users table for authentication
    await database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        profilePictureUrl TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add profilePictureUrl column to existing users table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE users ADD COLUMN profilePictureUrl TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('profilePictureUrl column already exists or was added successfully');
    }

    // Create products table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        productCode TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        minimumStockLevel INTEGER NOT NULL,
        imageUrl TEXT,
        description TEXT,
        readyToDeliver INTEGER DEFAULT 0,  -- New field to control shop visibility
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add imageUrl column to existing products table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE products ADD COLUMN imageUrl TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('imageUrl column already exists or was added successfully');
    }

    // Add description column to existing products table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE products ADD COLUMN description TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('description column already exists or was added successfully');
    }

    // Add updated_at column to existing products table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE products ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('updated_at column already exists or was added successfully');
    }

    // Add readyToDeliver column to existing products table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE products ADD COLUMN readyToDeliver INTEGER DEFAULT 0
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('readyToDeliver column already exists or was added successfully');
    }

    // Create product variants table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        color TEXT NOT NULL,
        size TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        imageUrl TEXT,
        FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // Create age-based pricing table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS product_age_pricing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId TEXT NOT NULL,
        ageMin INTEGER NOT NULL,
        ageMax INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // Create shops table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        contactPerson TEXT NOT NULL,
        contactPhone TEXT,
        city TEXT NOT NULL,
        exactLocation TEXT NOT NULL,
        tradeLicenseNumber TEXT,
        tinNumber TEXT,
        discount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Pending',
        monthlySalesTarget REAL NOT NULL DEFAULT 0,
        show_variant_details INTEGER NOT NULL DEFAULT 1,
        max_visible_variants INTEGER NOT NULL DEFAULT 1000,
        ai_distribution_mode TEXT NOT NULL DEFAULT 'proportional',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add contactPhone column to existing shops table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shops ADD COLUMN contactPhone TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('contactPhone column already exists or was added successfully');
    }

    // Add tradeLicenseNumber column to existing shops table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shops ADD COLUMN tradeLicenseNumber TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('tradeLicenseNumber column already exists or was added successfully');
    }

    // Add tinNumber column to existing shops table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shops ADD COLUMN tinNumber TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('tinNumber column already exists or was added successfully');
    }

    // Add show_variant_details column to existing shops table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shops ADD COLUMN show_variant_details INTEGER NOT NULL DEFAULT 1
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('show_variant_details column already exists or was added successfully');
    }

    // Add max_visible_variants column to existing shops table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shops ADD COLUMN max_visible_variants INTEGER NOT NULL DEFAULT 1000
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('max_visible_variants column already exists or was added successfully');
    }

    // Add ai_distribution_mode column to existing shops table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shops ADD COLUMN ai_distribution_mode TEXT NOT NULL DEFAULT 'proportional'
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('ai_distribution_mode column already exists or was added successfully');
    }

    // Add updated_at column to existing shops table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shops ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('updated_at column already exists or was added successfully');
    }

    // Create shop inventory table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS shop_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shopId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productVariantId TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        color TEXT NOT NULL,
        size TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        imageUrl TEXT,
        FOREIGN KEY (shopId) REFERENCES shops (id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (productVariantId) REFERENCES product_variants (id) ON DELETE CASCADE,
        UNIQUE(shopId, productVariantId)
      )
    `);

    // Add imageUrl column to existing shop_inventory table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE shop_inventory ADD COLUMN imageUrl TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('imageUrl column already exists or was added successfully');
    }

    // Add imageUrl column to existing marketing_orders table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN imageUrl TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('imageUrl column already exists or was added successfully');
    }

    // Create stock events table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS stock_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productId TEXT NOT NULL,
        variantId TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE
      )
    `);

    // Create orders table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        shopId TEXT NOT NULL,
        shopName TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        amount REAL NOT NULL,
        items TEXT NOT NULL,
        paymentSlipUrl TEXT,
        dispatchInfo TEXT,
        deliveryDate TEXT,
        isClosed INTEGER DEFAULT 0,
        feedback TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shopId) REFERENCES shops (id) ON DELETE CASCADE
      )
    `);

    // Add new columns to existing orders table if they don't exist
    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN paymentSlipUrl TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('paymentSlipUrl column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN dispatchInfo TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('dispatchInfo column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN deliveryDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('deliveryDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN isClosed INTEGER DEFAULT 0
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('isClosed column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN feedback TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('feedback column already exists or was added successfully');
    }

    // Add new columns for delivery performance tracking
    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN requestedDeliveryDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('requestedDeliveryDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN expectedReceiptDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('expectedReceiptDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN actualDispatchDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('actualDispatchDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE orders ADD COLUMN confirmationDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('confirmationDate column already exists or was added successfully');
    }

    // Create order items table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        productId TEXT NOT NULL,
        variantId TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE,
        FOREIGN KEY (variantId) REFERENCES product_variants (id) ON DELETE CASCADE
      )
    `);

    // Create notifications table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userType TEXT NOT NULL,
        shopId TEXT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        href TEXT NOT NULL,
        isRead INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create marketing orders table for production tracking
    await database.exec(`
      CREATE TABLE IF NOT EXISTS marketing_orders (
        id TEXT PRIMARY KEY,
        orderNumber TEXT UNIQUE NOT NULL,
        productName TEXT NOT NULL,
        productCode TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Placed Order',
        cuttingStatus TEXT,
        productionStatus TEXT,
        packingStatus TEXT,
        deliveryStatus TEXT,
        assignedTo TEXT,
        dueDate TEXT,
        completedDate TEXT,
        pdfUrl TEXT,
        imageUrl TEXT,
        isCompleted INTEGER DEFAULT 0,
        createdBy TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        orderPlacementDate TEXT,
        plannedDeliveryDate TEXT,
        sizeSetSampleApproved TEXT,
        productionStartDate TEXT,
        productionFinishedDate TEXT
      )
    `);

    // Create marketing order items table for size/color breakdown
    await database.exec(`
      CREATE TABLE IF NOT EXISTS marketing_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        size TEXT NOT NULL,
        color TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (orderId) REFERENCES marketing_orders (id) ON DELETE CASCADE
      )
    `);

    // Add new columns to existing marketing_orders table if they don't exist
    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN orderPlacementDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('orderPlacementDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN plannedDeliveryDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('plannedDeliveryDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN sizeSetSampleApproved TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('sizeSetSampleApproved column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN productionStartDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('productionStartDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN productionFinishedDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('productionFinishedDate column already exists or was added successfully');
    }

    // Create daily production status tracking table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS daily_production_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        date TEXT NOT NULL,
        size TEXT,
        color TEXT,
        quantity INTEGER NOT NULL,
        status TEXT NOT NULL,
        isTotalUpdate INTEGER DEFAULT 0,
        FOREIGN KEY (orderId) REFERENCES marketing_orders (id) ON DELETE CASCADE
      )
    `);
    
    // Add isTotalUpdate column to existing daily_production_status table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE daily_production_status ADD COLUMN isTotalUpdate INTEGER DEFAULT 0
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('isTotalUpdate column already exists or was added successfully');
    }

    // Add processStage column to existing daily_production_status table if it doesn't exist
    try {
      await database.exec(`
        ALTER TABLE daily_production_status ADD COLUMN processStage TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('processStage column already exists or was added successfully');
    }

    // Add process completion date columns to existing marketing_orders table if they don't exist
    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN cuttingCompletionDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('cuttingCompletionDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN productionCompletionDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('productionCompletionDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN packingCompletionDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('packingCompletionDate column already exists or was added successfully');
    }

    try {
      await database.exec(`
        ALTER TABLE marketing_orders ADD COLUMN deliveryCompletionDate TEXT
      `);
    } catch (error) {
      // Column might already exist, which is fine
      console.log('deliveryCompletionDate column already exists or was added successfully');
    }

    // Create audit logs table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        userId INTEGER,
        username TEXT,
        action TEXT NOT NULL,
        resourceType TEXT NOT NULL,
        resourceId TEXT,
        details TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default factory user if it doesn't exist
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('factory123', 10);
      
      await database.run(`
        INSERT OR IGNORE INTO users (username, password, role)
        VALUES (?, ?, ?)
      `, 'factory', hashedPassword, 'factory');
      
      console.log('Default factory user ensured in database');
    } catch (error) {
      console.error('Error creating default factory user:', error);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};