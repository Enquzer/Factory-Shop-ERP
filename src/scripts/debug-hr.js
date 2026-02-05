
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function debugHR() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  const user = await db.get("SELECT * FROM users WHERE username = 'HR'");
  console.log("HR USER RECORD:", JSON.stringify(user, null, 2));

  const role = await db.get("SELECT * FROM roles WHERE name = 'hr'");
  console.log("HR ROLE RECORD:", JSON.stringify(role, null, 2));
  
  await db.close();
}

debugHR();
