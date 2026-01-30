import { getDB } from './src/lib/db';
import { createCustomer } from './src/lib/customers-sqlite';

async function testCustomerCreation() {
  try {
    const db = await getDB();
    
    // Temporarily disable foreign key constraints
    await db.exec('PRAGMA foreign_keys = OFF');
    console.log('Foreign keys disabled');
    
    // Try to create a customer
    const customerData = {
      username: 'testuser123',
      email: 'testuser123@example.com', 
      firstName: 'Test',
      lastName: 'User',
      phone: '123456789',
      deliveryAddress: 'Test Address',
      city: 'Addis Ababa'
    };
    
    try {
      const customer = await createCustomer(customerData);
      console.log('Customer created successfully:', customer);
    } catch (error: any) {
      console.log('Error creating customer:', error.message);
    }
    
    // Re-enable foreign key constraints
    await db.exec('PRAGMA foreign_keys = ON');
    console.log('Foreign keys enabled');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCustomerCreation();