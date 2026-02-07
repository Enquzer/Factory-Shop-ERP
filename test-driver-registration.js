// Test driver registration
const testDriverRegistration = async () => {
  try {
    // First, let's see what employees exist by checking the API
    const response = await fetch('/api/employees', {
      headers: {
        'Authorization': 'Bearer test-token' // This will fail but we can see the structure
      }
    });
    
    console.log('Employees API response:', response.status);
    
    // Try to register a driver
    const registerResponse = await fetch('/api/drivers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        username: 'Motor1',
        employeeId: 1, // Assuming first employee
        vehicleType: 'motorcycle',
        licensePlate: 'TEST-001',
        contactPhone: '+1234567890'
      })
    });
    
    console.log('Registration response:', registerResponse.status);
    const data = await registerResponse.json();
    console.log('Registration data:', data);
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

// Run the test
testDriverRegistration();