// Direct test of driver API endpoints
async function testDriverAPI() {
  console.log('=== TESTING DRIVER API ENDPOINTS ===\n');
  
  try {
    // Test 1: Get all drivers (this is what the dispatch page uses)
    console.log('1. Testing GET /api/drivers (all drivers)...');
    const allDriversResponse = await fetch('http://localhost:3001/api/drivers');
    console.log('Status:', allDriversResponse.status);
    console.log('Status text:', allDriversResponse.statusText);
    
    if (allDriversResponse.ok) {
      const allDrivers = await allDriversResponse.json();
      console.log('All drivers count:', allDrivers.length);
      console.log('All drivers data:');
      console.log(JSON.stringify(allDrivers, null, 2));
    } else {
      const errorText = await allDriversResponse.text();
      console.log('Error response:', errorText);
    }
    
    console.log('\n---\n');
    
    // Test 2: Get available drivers specifically
    console.log('2. Testing GET /api/drivers/available...');
    const availableResponse = await fetch('http://localhost:3001/api/drivers/available');
    console.log('Status:', availableResponse.status);
    console.log('Status text:', availableResponse.statusText);
    
    if (availableResponse.ok) {
      const availableDrivers = await availableResponse.json();
      console.log('Available drivers count:', availableDrivers.length);
      console.log('Available drivers data:');
      console.log(JSON.stringify(availableDrivers, null, 2));
    } else {
      const errorText = await availableResponse.text();
      console.log('Error response:', errorText);
    }
    
    console.log('\n---\n');
    
    // Test 3: Get specific driver by ID
    console.log('3. Testing GET /api/drivers/Motor1...');
    const motor1Response = await fetch('http://localhost:3001/api/drivers/Motor1');
    console.log('Status:', motor1Response.status);
    console.log('Status text:', motor1Response.statusText);
    
    if (motor1Response.ok) {
      const motor1Data = await motor1Response.json();
      console.log('Motor1 driver data:');
      console.log(JSON.stringify(motor1Data, null, 2));
    } else {
      const errorText = await motor1Response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testDriverAPI();