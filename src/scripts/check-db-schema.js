
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function checkDb() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Opening database at:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    console.log('--- drivers table info ---');
    const driversInfo = await db.all("PRAGMA table_info(drivers)");
    console.log(driversInfo);

    console.log('--- ecommerce_orders table info ---');
    const ordersInfo = await db.all("PRAGMA table_info(ecommerce_orders)");
    console.log(ordersInfo);
    
    console.log('--- employees table info ---');
    const employeesInfo = await db.all("PRAGMA table_info(employees)");
    console.log(employeesInfo);

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await db.close();
  }
}

checkDb();
