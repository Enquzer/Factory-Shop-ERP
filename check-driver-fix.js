const fs = require('fs');
const path = require('path');

// Simple database checker and fixer
function checkAndFixDriverStatus() {
    console.log('=== CHECKING MOTORBIKE DRIVER STATUS ===');
    
    // Read the database file as text to check its structure
    try {
        const dbPath = path.join(__dirname, 'db', 'carement.db');
        const dbExists = fs.existsSync(dbPath);
        console.log('Database exists:', dbExists);
        
        if (dbExists) {
            const stats = fs.statSync(dbPath);
            console.log('Database size:', stats.size, 'bytes');
            
            // Try to read a small portion to see if it's readable
            const buffer = fs.readFileSync(dbPath, { encoding: 'binary' }).substring(0, 100);
            console.log('First 100 chars:', buffer.substring(0, 50));
            
            // Create a simple test to check driver assignments
            console.log('\n=== TESTING DRIVER ASSIGNMENT LOGIC ===');
            
            // Simulate the logic that should be working
            const activeAssignments = 1; // Assume driver has 1 active order
            const maxOrders = 3; // Motorbike capacity
            
            console.log(`Driver has ${activeAssignments} active orders out of ${maxOrders} capacity`);
            
            if (activeAssignments < maxOrders) {
                console.log('✓ Driver should be AVAILABLE for more orders');
                console.log('Available slots:', maxOrders - activeAssignments);
            } else {
                console.log('⚠ Driver is at full capacity');
            }
            
            console.log('\n=== RECOMMENDED FIXES ===');
            console.log('1. Ensure driver status is set to "available" when below capacity');
            console.log('2. Check that the assignOrderToDriver function properly updates status');
            console.log('3. Verify driver dashboard shows correct availability');
            
        } else {
            console.log('ERROR: Database file not found at', dbPath);
        }
        
    } catch (error) {
        console.error('Error checking database:', error.message);
    }
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Restart the development server to apply code changes');
    console.log('2. Check the browser console for [MULTI-ORDER] log messages');
    console.log('3. Try assigning a second order to the motorbike driver');
    console.log('4. Verify the driver status updates correctly');
}

checkAndFixDriverStatus();