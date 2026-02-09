const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./factory-shop.sqlite');

console.log('🔧 Setting up driver authentication...\n');

// Create users table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, async (err) => {
  if (err) {
    console.error('Error creating users table:', err);
    db.close();
    return;
  }

  console.log('Users table ready');

  // Hash the password
  const saltRounds = 10;
  const plainPassword = 'driver123';
  
  try {
    const hashedPassword = await new Promise((resolve, reject) => {
      bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });

    // Insert driver user
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password, role) 
      VALUES (?, ?, ?, ?)
    `, [
      'Motor1', 
      'motor1@driver.com', 
      hashedPassword, 
      'driver'
    ], function(err) {
      if (err) {
        console.error('Error creating driver user:', err);
      } else {
        console.log(`✅ Driver user 'Motor1' created successfully`);
        console.log(`   Username: Motor1`);
        console.log(`   Password: ${plainPassword}`);
        console.log(`   Role: driver`);
        console.log(`   User ID: ${this.lastID}`);
        
        // Link the driver record to this user
        db.run(`
          UPDATE drivers 
          SET userId = ? 
          WHERE name = 'Motor1'
        `, [this.lastID], function(updateErr) {
          if (updateErr) {
            console.error('Error linking driver to user:', updateErr);
          } else {
            console.log('✅ Driver linked to user account successfully');
            
            console.log('\n🚀 Driver authentication setup complete!');
            console.log('   To access the driver dashboard:');
            console.log('   1. Go to: http://localhost:3000/login');
            console.log('   2. Login with:');
            console.log('      Username: Motor1');
            console.log('      Password: driver123');
            console.log('   3. You will be redirected to the driver dashboard');
            console.log('   4. The map should now show the driver location');
          }
          
          db.close();
        });
      }
    });
  } catch (hashError) {
    console.error('Error hashing password:', hashError);
    db.close();
  }
});