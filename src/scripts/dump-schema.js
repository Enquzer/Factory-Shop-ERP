
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

async function checkDb() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Opening database at:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  try {
    const driversInfo = await db.all("PRAGMA table_info(drivers)");
    const ordersInfo = await db.all("PRAGMA table_info(ecommerce_orders)");
    const employeesInfo = await db.all("PRAGMA table_info(employees)");

    const result = {
      drivers: driversInfo,
      ecommerce_orders: ordersInfo,
      employees: employeesInfo
    };

    fs.writeFileSync('db_schema_details.json', JSON.stringify(result, null, 2));
    console.log('Schema details written to db_schema_details.json');

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await db.close();
  }
}

checkDb();
