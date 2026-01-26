// Test script to verify the BOM fix
const { getDb } = require('./src/lib/db');
const { generateMaterialRequisitionsForOrder } = require('./src/lib/bom');
const { getMarketingOrderByIdFromDB } = require('./src/lib/marketing-orders');

async function testBomFix() {
  console.log('Testing BOM fix...');
  
  try {
    // Get database connection
    const db = await getDb();
    
    // First, let's see what marketing orders exist with items
    console.log('\n--- Checking Marketing Orders ---');
    const orders = await db.all('SELECT id, productCode, quantity FROM marketing_orders LIMIT 5');
    console.log('Found orders:', orders);
    
    if (orders.length > 0) {
      // Check first order for items
      const firstOrder = orders[0];
      console.log('\n--- Checking Order Items ---');
      const orderItems = await db.all('SELECT * FROM marketing_order_items WHERE orderId = ?', [firstOrder.id]);
      console.log('Order items:', orderItems);
      
      // Check if product exists
      const product = await db.get('SELECT * FROM products WHERE productCode = ?', [firstOrder.productCode]);
      console.log('Product found:', product ? product.id : 'None');
      
      if (product) {
        // Check if BOM exists for this product
        const productBom = await db.all('SELECT * FROM product_bom WHERE productId = ?', [product.id]);
        console.log('Product BOM items:', productBom);
        
        if (productBom.length > 0) {
          console.log('\n--- Testing generateMaterialRequisitionsForOrder ---');
          
          // Test the function with the order
          try {
            await generateMaterialRequisitionsForOrder(firstOrder.id, firstOrder.quantity, product.id);
            console.log('✓ Requisitions generated successfully!');
            
            // Check the generated requisitions
            const requisitions = await db.all('SELECT * FROM material_requisitions WHERE orderId = ?', [firstOrder.id]);
            console.log('Generated requisitions:', requisitions);
          } catch (error) {
            console.error('✗ Error generating requisitions:', error.message);
          }
        } else {
          console.log('⚠ No BOM items found for this product. Make sure a style has been approved as a product.');
        }
      } else {
        console.log('⚠ No product found for this order. Make sure the style has been approved.');
      }
    } else {
      console.log('No marketing orders found in the database.');
    }
    
    console.log('\n--- Test completed ---');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testBomFix();