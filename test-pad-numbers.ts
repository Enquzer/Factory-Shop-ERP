import { padNumberGenerator } from './src/lib/pad-number-generator';
import { getDb } from './src/lib/db';

async function testPadNumberSystem() {
  console.log('=== Testing Pad Number System ===\n');
  
  try {
    // Test 1: Generate material requisition pad number
    console.log('1. Testing Material Requisition Pad Number Generation...');
    const materialPad = await padNumberGenerator.generateNext('material');
    console.log(`   Generated: ${materialPad.number} (Sequence: ${materialPad.sequence})`);
    
    // Test 2: Generate finished goods pad number for a shop
    console.log('\n2. Testing Finished Goods Pad Number Generation...');
    const finishedPad = await padNumberGenerator.generateNext('finished', 'SHP-001');
    console.log(`   Generated: ${finishedPad.number} (Sequence: ${finishedPad.sequence})`);
    
    // Test 3: Get current sequences
    console.log('\n3. Checking Current Sequences...');
    const materialSequence = await padNumberGenerator.getCurrentSequence('material');
    const finishedSequence = await padNumberGenerator.getCurrentSequence('finished', 'SHP-001');
    console.log(`   Material sequence: ${materialSequence}`);
    console.log(`   Finished goods sequence (SHP-001): ${finishedSequence}`);
    
    // Test 4: Get all sequences
    console.log('\n4. All Sequence Information:');
    const allSequences = await padNumberGenerator.getAllSequences();
    allSequences.forEach(seq => {
      console.log(`   - Type: ${seq.type}, Shop: ${seq.shopId || 'N/A'}, Current: ${seq.currentSequence}`);
    });
    
    // Test 5: Manual pad number update (simulate)
    console.log('\n5. Testing Manual Pad Number Update...');
    console.log('   Note: This would require a real requisition/order ID to test fully');
    
    console.log('\n=== All Tests Completed Successfully! ===');
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testPadNumberSystem().then(() => {
  console.log('Test completed.');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});