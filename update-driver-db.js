const { getDB } = require('./src/lib/db');

async function updateDriverStatus() {
  try {
    console.log('=== UPDATING DRIVER STATUS ===');
    
    const db = await getDB();
    
    // Update Motor1 driver status to available
    const result = await db.run("UPDATE drivers SET status = 'available' WHERE username = 'Motor1'");
    console.log('Update result:', result);
    console.log('Rows changed:', result.changes);
    
    // Verify the update
    const driver = await db.get("SELECT id, username, status, vehicle_type FROM drivers WHERE username = 'Motor1'");
    console.log('Updated driver:', driver);
    
    console.log('=== UPDATE COMPLETE ===');
  } catch (error) {
    console.error('Error updating driver status:', error);
  }
}

updateDriverStatus();