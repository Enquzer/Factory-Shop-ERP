// Simple test script to verify the API endpoint
async function testApi() {
  try {
    // Since we don't have a valid token, we'll test without authentication for now
    // In a real implementation, you would need to obtain a valid token first
    const response = await fetch('/api/reports/owner-kpis');
    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('API Test Error:', error);
  }
}

// Run the test
testApi();