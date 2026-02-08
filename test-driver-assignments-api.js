// Test driver assignments API
async function testDriverAssignments() {
  console.log('=== TESTING DRIVER ASSIGNMENTS API ===\n');
  
  try {
    // Test getting assignments for Motor1
    console.log('Testing GET /api/drivers/Motor1 (should return driver data and assignments)');
    
    const response = await fetch('http://localhost:3000/api/drivers/Motor1');
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Driver data:', data.driver);
      console.log('Assignments count:', data.assignments?.length || 0);
      if (data.assignments) {
        data.assignments.forEach((a, i) => {
          console.log(`  Assignment ${i+1}: Order ${a.orderId}, Status: ${a.status}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDriverAssignments();