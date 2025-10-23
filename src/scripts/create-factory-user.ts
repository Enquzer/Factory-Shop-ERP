import { registerUser } from '../lib/auth-sqlite';

async function createFactoryUser() {
  try {
    // Register a factory user with username "factory" and password "factory123"
    const result = await registerUser('factory', 'factory123', 'factory');
    
    if (result.success) {
      console.log('Factory user created successfully!');
      console.log('Username: factory');
      console.log('Password: factory123');
      console.log('Role: factory');
    } else {
      console.error('Failed to create factory user:', result.message);
    }
  } catch (error) {
    console.error('Error creating factory user:', error);
  }
}

// Run the function
createFactoryUser();