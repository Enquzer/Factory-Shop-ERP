const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
  const db = await open({
    filename: "c:\\Users\\USER 1\\Documents\\my_Codes\\Carement_Fashion\\Carement_Central\\Factory-Shop-ERP\\prisma\\dev.db",
    driver: sqlite3.Database
  });

  const info = await db.all("PRAGMA table_info(driver_assignments)");
  console.log("driver_assignments columns:");
  console.log(info.map(c => c.name));

  const content = await db.all("SELECT * FROM driver_assignments LIMIT 5");
  console.log("\ndriver_assignments content:");
  console.log(content);

  const driversInfo = await db.all("PRAGMA table_info(drivers)");
  console.log("\ndrivers columns:");
  console.log(driversInfo.map(c => c.name));

  const drivers = await db.all("SELECT id, name, employeeId, userId FROM drivers LIMIT 5");
  console.log("\ndrivers content:");
  console.log(drivers);
}

check().catch(console.error);
