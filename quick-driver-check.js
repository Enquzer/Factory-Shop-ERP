const fs = require('fs');
const path = require('path');

// Simple database reader for SQLite
function readSQLiteDB(dbPath) {
  try {
    const buffer = fs.readFileSync(dbPath);
    console.log(`Database file size: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('Error reading database:', error.message);
    return null;
  }
}

// Check if Motor1 exists and driver data
console.log('=== DRIVER REGISTRATION CHECK ===');

// Check users table for Motor1
console.log('\n1. Checking users table for Motor1...');
try {
  const dbPath = path.join(__dirname, 'db', 'carement.db');
  const dbBuffer = readSQLiteDB(dbPath);
  
  if (dbBuffer) {
    // Look for Motor1 in the raw data
    const motor1Index = dbBuffer.indexOf('Motor1');
    if (motor1Index !== -1) {
      console.log('✓ Motor1 user found in database');
      // Extract some context around the found data
      const start = Math.max(0, motor1Index - 50);
      const end = Math.min(dbBuffer.length, motor1Index + 100);
      const context = dbBuffer.slice(start, end).toString('utf8');
      console.log('Context around Motor1:', context.replace(/\0/g, ''));
    } else {
      console.log('✗ Motor1 user NOT found in database');
    }
  }
} catch (error) {
  console.error('Error checking users:', error.message);
}

// Check drivers table
console.log('\n2. Checking drivers table...');
try {
  const dbPath = path.join(__dirname, 'db', 'carement.db');
  const dbBuffer = readSQLiteDB(dbPath);
  
  if (dbBuffer) {
    // Look for drivers table entries
    const driverIndex = dbBuffer.indexOf('drivers');
    if (driverIndex !== -1) {
      console.log('✓ Drivers table found in database');
      // Look for driver records
      const driverRecordIndex = dbBuffer.indexOf('DRV-');
      if (driverRecordIndex !== -1) {
        console.log('✓ Driver records found');
        const start = Math.max(0, driverRecordIndex - 100);
        const end = Math.min(dbBuffer.length, driverRecordIndex + 200);
        const context = dbBuffer.slice(start, end).toString('utf8');
        console.log('Sample driver data:', context.replace(/\0/g, '').substring(0, 200));
      } else {
        console.log('? No DRV- records found, checking for other driver data...');
        // Look for any driver-related data
        const motorIndex = dbBuffer.indexOf('motor');
        if (motorIndex !== -1) {
          console.log('Found "motor" in database, extracting context...');
          const start = Math.max(0, motorIndex - 100);
          const end = Math.min(dbBuffer.length, motorIndex + 200);
          const context = dbBuffer.slice(start, end).toString('utf8');
          console.log('Motor-related data:', context.replace(/\0/g, '').substring(0, 200));
        }
      }
    } else {
      console.log('✗ Drivers table NOT found in database');
    }
  }
} catch (error) {
  console.error('Error checking drivers:', error.message);
}

console.log('\n=== END CHECK ===');