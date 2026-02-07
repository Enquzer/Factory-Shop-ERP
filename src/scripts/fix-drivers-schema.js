
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function fixDriversTable() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Opening database at:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    const tableInfo = await db.all("PRAGMA table_info(drivers)");
    const columns = tableInfo.map(c => c.name);

    if (!columns.includes('vehicleType')) {
      console.log('Adding vehicleType column...');
      await db.exec("ALTER TABLE drivers ADD COLUMN vehicleType TEXT CHECK(vehicleType IN ('motorbike', 'car', 'van', 'truck'))");
    }
    
    if (!columns.includes('status')) {
      console.log('Adding status column...');
      await db.exec("ALTER TABLE drivers ADD COLUMN status TEXT DEFAULT 'available' CHECK(status IN ('available', 'busy', 'offline'))");
    }

    if (!columns.includes('userId')) {
       console.log('Adding userId column...');
       await db.exec("ALTER TABLE drivers ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE SET NULL");
    }

    if (!columns.includes('currentLat')) {
        console.log('Adding currentLat column...');
        await db.exec("ALTER TABLE drivers ADD COLUMN currentLat REAL");
    }

    if (!columns.includes('currentLng')) {
        console.log('Adding currentLng column...');
        await db.exec("ALTER TABLE drivers ADD COLUMN currentLng REAL");
    }

    if (!columns.includes('locationLastUpdated')) {
        console.log('Adding locationLastUpdated column...');
        await db.exec("ALTER TABLE drivers ADD COLUMN locationLastUpdated DATETIME");
    }
    
    // Handle 'contact' vs 'phone'
    if (columns.includes('contact') && !columns.includes('phone')) {
         console.log('Migrating contact to phone...');
         // Rename isn't straight forward in SQLite for columns in some versions, but we can add phone and copy
         await db.exec("ALTER TABLE drivers ADD COLUMN phone TEXT");
         await db.exec("UPDATE drivers SET phone = contact");
    } else if (!columns.includes('phone')) {
        console.log('Adding phone column...');
        await db.exec("ALTER TABLE drivers ADD COLUMN phone TEXT");
    }

    console.log('Drivers table updated successfully.');

  } catch (error) {
    console.error('Error updating drivers table:', error);
  } finally {
    await db.close();
  }
}

fixDriversTable();
