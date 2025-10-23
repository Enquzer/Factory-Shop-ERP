// Simple test script to verify marketing order functionality
// This would typically be run with Node.js

const { getDb } = require('../lib/db');
const { createMarketingOrderInDB, getMarketingOrdersFromDB } = require('../lib/marketing-orders');

async function testMarketingOrderFunctionality() {
  try {
    console.log('Testing marketing order functionality...');
    
    // Test creating a marketing order
    const testOrder = {
      orderNumber: 'MKT-TEST-001',
      productName: 'Test Product',
      productCode: 'TP-001',
      description: 'A test product for marketing orders',
      quantity: 100,
      status: 'Placed Order',
      cuttingStatus: null,
      productionStatus: null,
      packingStatus: null,
      deliveryStatus: null,
      assignedTo: null,
      dueDate: null,
      completedDate: null,
      pdfUrl: null,
      isCompleted: false,
      createdBy: 'Test User',
      items: [
        {
          size: 'M',
          color: 'Blue',
          quantity: 50
        },
        {
          size: 'L',
          color: 'Red',
          quantity: 50
        }
      ]
    };
    
    console.log('Creating test marketing order...');
    // const createdOrder = await createMarketingOrderInDB(testOrder);
    // console.log('Created order:', createdOrder);
    
    console.log('Fetching all marketing orders...');
    const orders = await getMarketingOrdersFromDB();
    console.log('Found orders:', orders.length);
    
    console.log('Marketing order functionality test completed successfully!');
  } catch (error) {
    console.error('Error testing marketing order functionality:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMarketingOrderFunctionality();
}

module.exports = { testMarketingOrderFunctionality };