const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

async function createIEUsers() {
  try {
    const db = await open({
      filename: path.join(process.cwd(), 'db', 'carement.db'),
      driver: sqlite3.Database
    });

    // Check existing users
    const users = await db.all('SELECT username, role FROM users');
    console.log('Current users:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role})`);
    });

    // Create IE admin user
    console.log('\nCreating IE admin user...');
    const adminPassword = await bcrypt.hash('ieadmin123', 10);
    await db.run(
      'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
      ['ie_admin', adminPassword, 'ie_admin']
    );
    console.log('✅ IE Admin created:');
    console.log('   Username: ie_admin');
    console.log('   Password: ieadmin123');
    console.log('   Role: ie_admin');

    // Create IE regular user
    console.log('\nCreating IE regular user...');
    const userPassword = await bcrypt.hash('ieuser123', 10);
    await db.run(
      'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
      ['ie_user', userPassword, 'ie_user']
    );
    console.log('✅ IE User created:');
    console.log('   Username: ie_user');
    console.log('   Password: ieuser123');
    console.log('   Role: ie_user');

    await db.close();
    console.log('\n🎉 IE users setup completed!');

  } catch (error) {
    console.error('Error creating IE users:', error);
  }
}

createIEUsers();