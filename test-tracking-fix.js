const http = require('http');

// Test the order tracking API endpoint
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/order-tracking/ECOM-1770563482235',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Response is not valid JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();