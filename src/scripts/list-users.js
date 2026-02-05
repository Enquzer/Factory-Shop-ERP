
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function listUsers() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  const users = await db.all("SELECT username, role, password FROM users");
  console.log("USERS IN DATABASE:");
  users.forEach(u => {
    console.log(`- Username: ${u.username}, Role: ${u.role}`);
  });
  await db.close();
}

listUsers();
