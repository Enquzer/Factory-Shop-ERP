const https = require('https');
const http = require('http');

// Test function to call the marketing order completion API
async function testCompletionAPI() {
  const orderId = 'MKT-ORD-1761255630481'; // Use an existing order ID
  
  const data = JSON.stringify({
    isCompleted: true,
    status: 'Completed'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/marketing-orders/${orderId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('Response Body:', responseBody);
        resolve(responseBody);
      });
    });

    req.on('error', (error) => {
      console.error('Request Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run the test
testCompletionAPI()
  .then(result => {
    console.log('API test completed');
  })
  .catch(error => {
    console.error('API test failed:', error);
  });