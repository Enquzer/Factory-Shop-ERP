import { getDb } from '../lib/db';

async function checkFactoryUser() {
  try {
    const db = await getDb();
    
    // Check if the factory user exists
    const user = await db.get(`
      SELECT * FROM users WHERE username = ? AND role = ?
    `, 'factory', 'factory');
    
    if (user) {
      console.log('Factory user found in database:');
      console.log('ID:', user.id);
      console.log('Username:', user.username);
      console.log('Role:', user.role);
      console.log('Created at:', user.created_at);
    } else {
      console.log('Factory user not found in database');
    }
    
    // List all users to see what's in the database
    const allUsers = await db.all(`SELECT * FROM users`);
    console.log('\nAll users in database:');
    console.table(allUsers);
  } catch (error) {
    console.error('Error checking factory user:', error);
  }
}

checkFactoryUser();