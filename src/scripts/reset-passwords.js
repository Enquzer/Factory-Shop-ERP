
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

const usersToReset = [
  { username: 'planning', password: 'planning123' },
  { username: 'sample', password: 'sample123' },
  { username: 'cutting', password: 'cutting123' },
  { username: 'sewing', password: 'sewing123' },
  { username: 'finishing', password: 'finishing123' },
  { username: 'packing', password: 'packing123' },
  { username: 'quality', password: 'quality123' },
  { username: 'factory', password: 'factory123' },
  { username: 'finance', password: 'finance123' },
  { username: 'store', password: 'store123' },
  { username: 'designer', password: 'designer123' }
];

async function resetPasswords() {
  console.log('Starting password reset for production team...');
  
  for (const user of usersToReset) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE users SET password = ? WHERE username = ?`,
          [hashedPassword, user.username],
          function(err) {
            if (err) {
              console.error(`Error updating ${user.username}:`, err);
              reject(err);
            } else if (this.changes === 0) {
              // User doesn't exist, maybe we should insert?
              // For now just report it.
              console.log(`User ${user.username} not found in database.`);
              resolve();
            } else {
              console.log(`Successfully reset password for: ${user.username}`);
              resolve();
            }
          }
        );
      });
    } catch (err) {
      console.error(`Unexpected error for ${user.username}:`, err);
    }
  }
  
  db.close();
  console.log('Password reset complete.');
}

resetPasswords();
