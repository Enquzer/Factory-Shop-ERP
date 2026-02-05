
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkRoles() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  const roles = await db.all("SELECT * FROM roles");
  console.log(JSON.stringify(roles, null, 2));

  const hrRole = roles.find(r => r.name === 'hr');
  if (!hrRole) {
    console.log("HR role missing, inserting...");
    await db.run(
      'INSERT INTO roles (name, displayName, description, permissions) VALUES (?, ?, ?, ?)',
      ['hr', 'HR Manager', 'HR and Incentive management access', JSON.stringify({"dashboard":true,"hr":true,"reports":true})]
    );
    console.log("HR role inserted.");
  }

  await db.close();
}

checkRoles();
