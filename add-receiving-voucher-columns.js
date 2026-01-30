const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding finished goods receiving voucher columns...\n');

db.serialize(() => {
  // Create finished_goods_receiving_vouchers table
  console.log('Creating finished_goods_receiving_vouchers table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS finished_goods_receiving_vouchers (
      id TEXT PRIMARY KEY,
      marketingOrderId TEXT NOT NULL,
      productCode TEXT NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      receivingDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      receivedBy TEXT,
      status TEXT DEFAULT 'Pending', -- Pending, Received, Verified
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      -- Pad number fields
      padNumber TEXT,
      padSequence INTEGER,
      padPrefix TEXT,
      padFormat TEXT,
      FOREIGN KEY (marketingOrderId) REFERENCES marketing_orders (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating finished_goods_receiving_vouchers table:', err.message);
    } else {
      console.log('  Created finished_goods_receiving_vouchers table');
    }
  });

  // Add pad number columns to existing marketing_orders table for store registration
  console.log('\nAdding pad number columns to marketing_orders table...');
  
  const orderColumns = [
    { name: 'receivingVoucherPadNumber', type: 'TEXT' },
    { name: 'receivingVoucherSequence', type: 'INTEGER' },
    { name: 'receivingVoucherPrefix', type: 'TEXT' },
    { name: 'receivingVoucherFormat', type: 'TEXT' }
  ];

  orderColumns.forEach(column => {
    db.run(`ALTER TABLE marketing_orders ADD COLUMN ${column.name} ${column.type}`, (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log(`  Column ${column.name} already exists`);
        } else {
          console.error(`  Error adding ${column.name}:`, err.message);
        }
      } else {
        console.log(`  Added column ${column.name} (${column.type})`);
      }
    });
  });

  // Initialize receiving voucher sequence in pad_number_sequences
  console.log('\nInitializing receiving voucher sequence...');
  
  db.run(`
    INSERT OR IGNORE INTO pad_number_sequences 
    (id, type, shopId, currentSequence, prefix, format, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    'receiving-voucher-default',
    'receiving',
    null,
    0,
    'FG-RV',
    'PREFIX-SEQUENCE'
  ], (err) => {
    if (err) {
      console.error('  Error initializing receiving voucher sequence:', err.message);
    } else {
      console.log('  Initialized receiving voucher sequence');
    }
  });
});

// Close database connection
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\nReceiving voucher database migration completed successfully!');
    }
  });
}, 1000);