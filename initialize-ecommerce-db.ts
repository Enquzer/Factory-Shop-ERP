import { initializeCustomerTables } from './src/lib/customers-sqlite';

async function initializeEcommerceDatabase() {
  try {
    console.log('Initializing e-commerce database tables...');
    await initializeCustomerTables();
    console.log('E-commerce database tables initialized successfully!');
  } catch (error) {
    console.error('Error initializing e-commerce database:', error);
    process.exit(1);
  }
}

initializeEcommerceDatabase();