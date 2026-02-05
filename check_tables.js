
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkTables() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
  tables.forEach(t => console.log(t.name));
  await db.close();
}

checkTables();