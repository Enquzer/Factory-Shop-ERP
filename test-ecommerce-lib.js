const fetch = require('node-fetch');

async function testApi() {
  try {
    // We can't easily fetch from local api without auth, 
    // but we can test the library function directly
    const { getAllEcommerceOrders } = require('./src/lib/ecommerce-manager');
    const orders = await getAllEcommerceOrders();
    console.log('Result from getAllEcommerceOrders:', JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testApi();
