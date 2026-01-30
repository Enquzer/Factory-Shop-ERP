const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding pad number columns to database tables...\n');

db.serialize(() => {
  // Add columns to material_requisitions table
  console.log('Updating material_requisitions table...');
  
  const materialColumns = [
    { name: 'padNumber', type: 'TEXT' },
    { name: 'padSequence', type: 'INTEGER' },
    { name: 'padPrefix', type: 'TEXT' },
    { name: 'padFormat', type: 'TEXT' }
  ];

  materialColumns.forEach(column => {
    db.run(`ALTER TABLE material_requisitions ADD COLUMN ${column.name} ${column.type}`, (err) => {
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

  // Add columns to orders table
  console.log('\nUpdating orders table...');
  
  const orderColumns = [
    { name: 'padNumber', type: 'TEXT' },
    { name: 'padSequence', type: 'INTEGER' },
    { name: 'padPrefix', type: 'TEXT' },
    { name: 'padFormat', type: 'TEXT' }
  ];

  orderColumns.forEach(column => {
    db.run(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.type}`, (err) => {
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

  // Create pad number sequences table for tracking current sequences
  console.log('\nCreating pad_number_sequences table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS pad_number_sequences (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'material' or 'finished'
      shopId TEXT, -- NULL for material, shop ID for finished goods
      currentSequence INTEGER NOT NULL DEFAULT 0,
      prefix TEXT NOT NULL,
      format TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, shopId)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating pad_number_sequences table:', err.message);
    } else {
      console.log('  Created pad_number_sequences table');
    }
  });

  // Initialize default sequences
  console.log('\nInitializing default sequences...');
  
  const defaultSequences = [
    {
      id: 'material-default',
      type: 'material',
      shopId: null,
      currentSequence: 0,
      prefix: 'RM',
      format: 'PREFIX-SEQUENCE'
    }
  ];

  defaultSequences.forEach(seq => {
    db.run(`
      INSERT OR IGNORE INTO pad_number_sequences 
      (id, type, shopId, currentSequence, prefix, format)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [seq.id, seq.type, seq.shopId, seq.currentSequence, seq.prefix, seq.format], (err) => {
      if (err) {
        console.error(`  Error initializing sequence ${seq.id}:`, err.message);
      } else {
        console.log(`  Initialized sequence ${seq.id}`);
      }
    });
  });
});

// Close database connection
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\nDatabase migration completed successfully!');
    }
  });
}, 1000);