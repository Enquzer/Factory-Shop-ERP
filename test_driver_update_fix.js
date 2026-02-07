const { updateDriver } = require('./src/lib/drivers-sqlite.ts');

async function testDriverUpdate() {
  console.log('Testing driver update fix...');
  
  try {
    // Test updating a non-existent driver (should create new record)
    const result = await updateDriver('Motor1', { status: 'available' });
    console.log('Update result:', result);
    
    if (result) {
      console.log('✅ Driver update/create successful!');
    } else {
      console.log('❌ Driver update/create failed');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testDriverUpdate();