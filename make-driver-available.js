// Quick fix to make Motor1 driver available
const fs = require('fs');
const path = require('path');

async function makeDriverAvailable() {
  console.log('=== MAKING DRIVER AVAILABLE ===\n');
  
  try {
    // First, let's check the current driver status
    console.log('1. Checking current driver status...');
    const checkResponse = await fetch('http://localhost:3000/api/drivers/Motor1');
    console.log('Check response status:', checkResponse.status);
    
    if (checkResponse.ok) {
      const driverData = await checkResponse.json();
      console.log('Current driver data:', driverData);
    } else {
      console.log('Failed to get driver data:', await checkResponse.text());
    }
    
    console.log('\n---\n');
    
    // Try to update driver status to available
    console.log('2. Attempting to update driver status to available...');
    
    // We'll need to simulate this through the proper API or direct database update
    // For now, let's try the update driver endpoint
    const updateResponse = await fetch('http://localhost:3000/api/drivers/Motor1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // No auth for now since we're debugging
      },
      body: JSON.stringify({
        status: 'available'
      })
    });
    
    console.log('Update response status:', updateResponse.status);
    const updateData = await updateResponse.json();
    console.log('Update response:', updateData);
    
    console.log('\n---\n');
    
    // Check if it worked
    console.log('3. Verifying driver status...');
    const verifyResponse = await fetch('http://localhost:3000/api/drivers/Motor1');
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('Verified driver status:', verifyData.driver?.status || 'Unknown');
    }
    
  } catch (error) {
    console.error('Error making driver available:', error.message);
  }
  
  console.log('\n=== PROCESS COMPLETE ===');
}

makeDriverAvailable();