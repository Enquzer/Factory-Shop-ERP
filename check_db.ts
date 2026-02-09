import { getDB } from './src/lib/db.ts';

async function checkSchema() {
  const db = await getDB();
  const info = await db.all("PRAGMA table_info(driver_assignments)");
  console.log("driver_assignments table info:");
  console.log(JSON.stringify(info, null, 2));
  
  const assignments = await db.all("SELECT * FROM driver_assignments LIMIT 5");
  console.log("\ndriver_assignments content (first 5):");
  console.log(JSON.stringify(assignments, null, 2));

  const drivers = await db.all("SELECT * FROM drivers LIMIT 5");
  console.log("\ndrivers content (first 5):");
  console.log(JSON.stringify(drivers, null, 2));
}

checkSchema().catch(console.error);
