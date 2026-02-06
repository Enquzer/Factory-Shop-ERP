const { getDb } = require('./src/lib/db');
const bcrypt = require('bcryptjs');

async function setupIEUser() {
  try {
    const db = await getDb();
    
    // Check existing users
    const users = await db.all('SELECT username, role FROM users');
    console.log('Current users:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role})`);
    });
    
    // Check if IE users already exist
    const ieUsers = await db.all("SELECT username, role FROM users WHERE role LIKE '%ie%'");
    if (ieUsers.length > 0) {
      console.log('\nExisting IE users:');
      ieUsers.forEach(user => {
        console.log(`- ${user.username} (${user.role})`);
      });
      return;
    }
    
    // Create IE admin user
    console.log('\nCreating IE admin user...');
    const hashedPassword = await bcrypt.hash('ieadmin123', 10);
    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['ie_admin', hashedPassword, 'ie_admin']
    );
    
    console.log('✅ IE Admin user created:');
    console.log('Username: ie_admin');
    console.log('Password: ieadmin123');
    console.log('Role: ie_admin');
    
    // Create IE regular user
    console.log('\nCreating IE regular user...');
    const hashedPassword2 = await bcrypt.hash('ieuser123', 10);
    const result2 = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      ['ie_user', hashedPassword2, 'ie_user']
    );
    
    console.log('✅ IE User created:');
    console.log('Username: ie_user');
    console.log('Password: ieuser123');
    console.log('Role: ie_user');
    
    await db.close();
    
  } catch (error) {
    console.error('Error setting up IE users:', error);
  }
}

setupIEUser();