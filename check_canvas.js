const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });
  
  const canvas = await db.get("SELECT * FROM style_canvases WHERE styleId = 'STY-1769110200709'");
  console.log(JSON.stringify(canvas, null, 2));
}

check();
