// Script to update all existing products to be ready for delivery
// This ensures that products already in the database will be visible to shop users

import { getDb } from '../lib/db';

async function updateProductsReadyStatus() {
  try {
    console.log('Updating products ready status...');
    
    const db = await getDb();
    
    // Update all products to set readyToDeliver = 1
    const result = await db.run(`
      UPDATE products 
      SET readyToDeliver = 1 
      WHERE readyToDeliver IS NULL OR readyToDeliver = 0
    `);
    
    console.log(`Updated ${result.changes} products to be ready for delivery.`);
    console.log('All products are now visible to shop users.');
    
  } catch (error) {
    console.error('Error updating products ready status:', error);
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  updateProductsReadyStatus();
}

export { updateProductsReadyStatus };