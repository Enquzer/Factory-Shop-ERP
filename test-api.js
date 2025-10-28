const http = require('http');

// Test the factory stock API with a valid variant ID
const validVariantId = 'VAR-1760119080004-543'; // This is one of the valid variants we found earlier

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/factory-stock?variantId=${validVariantId}`,
  method: 'GET'
};

console.log(`Testing factory stock API with valid variant ID: ${validVariantId}`);

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    console.log(`Response Body: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('Request completed');
  });
});

req.on('error', (error) => {
  console.error(`Error: ${error.message}`);
});

req.end();

// Also test with the invalid VAR-1 to confirm it returns 404
setTimeout(() => {
  const invalidOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/factory-stock?variantId=VAR-1',
    method: 'GET'
  };
  
  console.log('\nTesting factory stock API with invalid variant ID: VAR-1');
  
  const invalidReq = http.request(invalidOptions, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
      console.log(`Response Body: ${chunk}`);
    });
    
    res.on('end', () => {
      console.log('Request completed');
    });
  });
  
  invalidReq.on('error', (error) => {
    console.error(`Error: ${error.message}`);
  });
  
  invalidReq.end();
}, 2000);