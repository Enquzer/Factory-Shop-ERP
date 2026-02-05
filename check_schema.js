
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkSchema() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  const styles = await db.all("PRAGMA table_info(styles)");
  console.log('--- styles ---');
  styles.forEach(c => console.log(c.name, c.type));

  const bom = await db.all("PRAGMA table_info(bom)");
  console.log('--- bom ---');
  bom.forEach(c => console.log(c.name, c.type));

  await db.close();
}

checkSchema();
