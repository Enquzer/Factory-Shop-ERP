const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });
  
  const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='sample_inspections'");
  console.log(schema.sql);
  
  const inspections = await db.all("SELECT id, productId, styleId FROM sample_inspections ORDER BY requestDate DESC LIMIT 5");
  console.log(JSON.stringify(inspections, null, 2));
}

check();