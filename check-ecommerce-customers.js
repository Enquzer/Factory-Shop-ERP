const { getDB } = require('./src/lib/db');

async function checkEcommerceCustomers() {
  try {
    const db = await getDB();
    
    // Get all users with customer role
    const users = await db.all(`
      SELECT id, username, role, created_at 
      FROM users 
      WHERE role = 'customer'
      ORDER BY created_at DESC
    `);
    
    console.log('Ecommerce customer users:');
    console.log('========================');
    users.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Created: ${user.created_at}`);
      console.log('---');
    });
    
    // Try to get customer details (may fail due to database corruption)
    try {
      const customers = await db.all(`
        SELECT id, username, email, firstName, lastName, phone, city
        FROM customers
        ORDER BY id DESC
      `);
      
      console.log('\nCustomer details (if available):');
      console.log('==============================');
      customers.forEach(customer => {
        console.log(`ID: ${customer.id}`);
        console.log(`Username: ${customer.username}`);
        console.log(`Email: ${customer.email}`);
        console.log(`Name: ${customer.firstName} ${customer.lastName}`);
        console.log(`Phone: ${customer.phone}`);
        console.log(`City: ${customer.city}`);
        console.log('---');
      });
    } catch (error) {
      console.log('\nCustomer details table unavailable due to database corruption');
    }
    
  } catch (error) {
    console.error('Error checking ecommerce customers:', error.message);
  }
}

checkEcommerceCustomers();