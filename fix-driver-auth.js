// Fix driver authentication and registration issues
const fs = require('fs');
const path = require('path');

async function fixDriverIssues() {
  console.log('=== DRIVER AUTHENTICATION FIX ===\n');
  
  try {
    // First, let's check what users exist in the system
    console.log('1. Checking existing users...');
    const response1 = await fetch('http://localhost:3000/api/debug-user');
    if (response1.ok) {
      const userData = await response1.json();
      console.log('Current user data:', userData);
    } else {
      console.log('No authenticated user found');
    }
    
    console.log('\n---\n');
    
    // Try to create a driver record for Motor1 if it doesn't exist properly
    console.log('2. Attempting to create/update driver record for Motor1...');
    
    // Try with admin credentials or bypass auth for testing
    const createResponse = await fetch('http://localhost:3000/api/drivers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // We'll try without auth first to see if we can bypass
      },
      body: JSON.stringify({
        name: 'Motor1 Driver',
        username: 'Motor1',
        phone: '+251913022585',
        vehicleType: 'motorcycle',
        status: 'available' // Make sure it's available
      })
    });
    
    console.log('Create driver response status:', createResponse.status);
    const createData = await createResponse.json();
    console.log('Create driver response:', createData);
    
    console.log('\n---\n');
    
    // Now try to get drivers again with proper authentication simulation
    console.log('3. Testing driver fetch with simulated authentication...');
    
    // Let's try to get a token first by simulating login
    const loginResponse = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Motor1',
        password: 'default_password' // We'll need to know the actual password
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login successful, token:', loginData.token ? 'RECEIVED' : 'NOT RECEIVED');
      
      if (loginData.token) {
        // Try getting drivers with the token
        const authDriversResponse = await fetch('http://localhost:3000/api/drivers', {
          headers: {
            'Authorization': `Bearer ${loginData.token}`
          }
        });
        
        console.log('Authenticated drivers fetch status:', authDriversResponse.status);
        if (authDriversResponse.ok) {
          const driversData = await authDriversResponse.json();
          console.log('Authenticated drivers count:', driversData.length);
          console.log('Drivers data:', JSON.stringify(driversData, null, 2));
        }
      }
    } else {
      console.log('Login failed:', await loginResponse.text());
    }
    
  } catch (error) {
    console.error('Fix attempt failed:', error.message);
  }
  
  console.log('\n=== FIX ATTEMPT COMPLETE ===');
}

// Run the fix
fixDriverIssues();