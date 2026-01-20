const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createPackingUser() {
  // Open database
  const dbPath = path.join(__dirname, 'db', 'carement.db');
  const db = new sqlite3.Database(dbPath);

  // Hash the password
  const password = 'packing123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert the user
  db.serialize(() => {
    db.run(
      `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
      ['packing123', hashedPassword, 'packing'],
      function(err) {
        if (err) {
          console.error('Error creating user:', err);
        } else if (this.changes > 0) {
          console.log('Packing user created successfully with username: packing123 and password: packing123');
        } else {
          console.log('Packing user already exists with username: packing123');
        }
      }
    );
  });

  // Close database
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
  });
}

// Run the function
createPackingUser().catch(console.error);