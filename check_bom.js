
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkBOM() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  const bom = await db.all("PRAGMA table_info(bom)");
  console.log('--- bom ---');
  bom.forEach(c => console.log(c.name, c.type));
  
  // Also check if there's an operation_breakdown table
  const ob = await db.all("PRAGMA table_info(operation_breakdown)");
  if (ob.length > 0) {
    console.log('--- operation_breakdown ---');
    ob.forEach(c => console.log(c.name, c.type));
  } else {
    console.log('--- operation_breakdown NOT FOUND ---');
  }

  await db.close();
}

checkBOM();
