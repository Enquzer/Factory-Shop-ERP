// Test driver status update functionality
async function testDriverStatusUpdate() {
  console.log('=== TESTING DRIVER STATUS UPDATE ===\n');
  
  try {
    // Test 1: Check current driver status
    console.log('1. Checking current driver status...');
    const response1 = await fetch('http://localhost:3001/api/drivers/Motor1');
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('Current driver status:', data1.driver?.status);
    } else {
      console.log('Failed to get driver status:', response1.status);
    }
    
    console.log('\n2. Simulating delivery completion...');
    // Find a recent assignment for Motor1
    const assignmentsResponse = await fetch('http://localhost:3001/api/driver-assignments?driverId=Motor1');
    if (assignmentsResponse.ok) {
      const assignmentsData = await assignmentsResponse.json();
      const recentAssignment = assignmentsData.assignments?.[0];
      
      if (recentAssignment) {
        console.log('Found assignment:', recentAssignment.id);
        
        // Update assignment status to delivered
        const updateResponse = await fetch(`http://localhost:3001/api/driver-assignments/${recentAssignment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'delivered'
          })
        });
        
        console.log('Update response status:', updateResponse.status);
        if (updateResponse.ok) {
          const updateData = await updateResponse.json();
          console.log('Assignment updated successfully');
        } else {
          console.log('Failed to update assignment:', await updateResponse.text());
        }
      } else {
        console.log('No assignments found for Motor1');
      }
    }
    
    console.log('\n3. Checking driver status after delivery...');
    const response3 = await fetch('http://localhost:3001/api/drivers/Motor1');
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('Driver status after delivery:', data3.driver?.status);
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testDriverStatusUpdate();