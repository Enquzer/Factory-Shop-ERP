// Test script to verify comprehensive dispatch PDF generation
const fetch = require('node-fetch');

async function testDispatchPDFGeneration() {
    console.log('Testing comprehensive dispatch PDF generation...');
    
    // Test with a known order ID (you'll need to replace this with a valid order ID from your database)
    const orderId = 'MexicoShop_Jan26_Order38'; // Replace with actual order ID
    
    try {
        console.log(`\nTesting PDF generation for order: ${orderId}`);
        
        // Test the main dispatch endpoint
        const response = await fetch(`http://localhost:3000/api/dispatch/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // Replace with valid token
            },
            body: JSON.stringify({ includePackingList: true })
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Status Text: ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ PDF generation successful');
            console.log('Dispatch PDF URL:', data.dispatchPdfUrl);
            console.log('Packing List PDF URL:', data.packingListPdfUrl);
            console.log('Summary:', data.summary);
        } else {
            const errorData = await response.json();
            console.log('❌ PDF generation failed:', errorData.error);
        }
    } catch (error) {
        console.log('Error:', error.message);
    }
    
    console.log('\nTest completed. Check browser console for client-side verification.');
}

// Run the test
testDispatchPDFGeneration();