
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrateValidation() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Opening database:', dbPath);

  let db;
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  } catch (error) {
    console.error('Failed to open DB:', error);
    process.exit(1);
  }

  console.log('Starting migration for production_ledger...');

  try {
    // 1. Rename existing table
    // Check if production_ledger exists
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='production_ledger'");
    
    if (tableExists) {
      console.log('Backing up old production_ledger...');
      await db.run("ALTER TABLE production_ledger RENAME TO production_ledger_backup_" + Date.now());
    }

    // 2. Create new table
    console.log('Creating new production_ledger table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS production_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT NOT NULL,
        componentName TEXT,
        processType TEXT NOT NULL,
        size TEXT,
        color TEXT,
        quantity INTEGER NOT NULL,
        userId TEXT,
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Migrate data if backup exists
    // Note: The specific backup name is dynamic, so we find it or we just select from the one we just renamed.
    // Actually better to get the renamed name.
    const backups = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'production_ledger_backup_%' ORDER BY name DESC LIMIT 1");
    if (backups.length > 0) {
      const backupName = backups[0].name;
      console.log(`Migrating data from ${backupName}...`);
      
      // We need to map columns. Old table had: orderId, stage, quantity, date, userId, notes, created_at
      // New table: orderId, processType, quantity, userId, notes, timestamp
      // componentName, size, color will be null
      
      await db.run(`
        INSERT INTO production_ledger (orderId, processType, quantity, userId, notes, timestamp)
        SELECT orderId, stage, quantity, userId, notes, created_at
        FROM ${backupName}
      `);
      console.log('Data migration complete.');
    } else {
        console.log('No backup found (maybe logging was empty), skipped data migration.');
    }

    // 4. Create Indexes
    console.log('Creating indexes...');
    await db.run("CREATE INDEX IF NOT EXISTS idx_prod_ledger_order ON production_ledger(orderId)");
    await db.run("CREATE INDEX IF NOT EXISTS idx_prod_ledger_process ON production_ledger(processType)");

    console.log('Migration successful.');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateValidation();
