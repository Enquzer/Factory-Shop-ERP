
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

async function createHRUser() {
  const username = 'HR';
  const password = 'Hr123';
  const role = 'hr'; // Dedicated HR role with restricted access
  
  console.log(`Creating user: ${username}...`);
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        console.error('Error checking user:', err);
        db.close();
        return;
      }
      
      if (row) {
        // Update existing user
        db.run(
          'UPDATE users SET password = ?, role = ? WHERE username = ?',
          [hashedPassword, role, username],
          (err) => {
            if (err) console.error('Error updating user:', err);
            else console.log(`User ${username} updated successfully.`);
            db.close();
          }
        );
      } else {
        // Create new user
        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          [username, hashedPassword, role],
          (err) => {
            if (err) console.error('Error creating user:', err);
            else console.log(`User ${username} created successfully.`);
            db.close();
          }
        );
      }
    });

    // Also ensure the role has HR permissions in the roles table
    const rolesDb = new sqlite3.Database(dbPath);
    rolesDb.get('SELECT permissions FROM roles WHERE name = ?', [role], (err, row) => {
      if (row) {
        let permissions = JSON.parse(row.permissions);
        permissions.hr = true; // explicitly enable HR permission
        rolesDb.run('UPDATE roles SET permissions = ? WHERE name = ?', [JSON.stringify(permissions), role], () => {
          console.log(`Updated permissions for role: ${role}`);
          rolesDb.close();
        });
      }
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    db.close();
  }
}

createHRUser();
