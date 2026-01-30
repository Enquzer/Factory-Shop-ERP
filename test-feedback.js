// Test script to verify product feedback functionality
async function testProductFeedback() {
  console.log('Testing Product Feedback System...');
  
  try {
    // Test 1: Get feedback for a product (no auth required)
    console.log('\n1. Testing GET /api/product-feedback?productId=...');
    const productId = 'PROD-123'; // Replace with actual product ID
    const statsResponse = await fetch(`http://localhost:3000/api/product-feedback?productId=${productId}`);
    console.log('Status:', statsResponse.status);
    
    if (statsResponse.ok) {
      const data = await statsResponse.json();
      console.log('Response:', data);
    } else {
      console.log('Error response:', await statsResponse.text());
    }
    
    // Test 2: Try to submit feedback without auth (should fail)
    console.log('\n2. Testing POST /api/product-feedback without auth...');
    const feedbackResponse = await fetch('http://localhost:3000/api/product-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: productId,
        rating: 4,
        comment: 'Great product!'
      })
    });
    console.log('Status:', feedbackResponse.status);
    console.log('Response:', await feedbackResponse.text());
    
    console.log('\n✅ Basic API tests completed. Please test with authenticated shop user in the browser.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testProductFeedback();