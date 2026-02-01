const { getDb } = require('./src/lib/db');

async function checkHandoverRecords() {
  try {
    const db = await getDb();
    
    // Check cutting handovers
    const handovers = await db.all(`
      SELECT ch.*, cr.orderNumber, cr.productName
      FROM cutting_handovers ch
      JOIN cutting_records cr ON ch.cuttingRecordId = cr.id
      ORDER BY ch.created_at DESC
      LIMIT 5
    `);
    
    console.log('Recent Cutting Handovers:');
    console.log('========================');
    handovers.forEach((h, i) => {
      console.log(`${i + 1}. Handover ID: ${h.id}`);
      console.log(`   Order: ${h.orderNumber} (${h.productName})`);
      console.log(`   Date: ${h.handoverDate}`);
      console.log(`   By: ${h.handoverBy} → ${h.receivedBy}`);
      console.log(`   Created: ${h.created_at}`);
      console.log('');
    });
    
    if (handovers.length === 0) {
      console.log('No handover records found.');
      return;
    }
    
    // Check handover items for the first handover
    const firstHandover = handovers[0];
    const items = await db.all(`
      SELECT chi.*, ci.size, ci.color
      FROM cutting_handover_items chi
      JOIN cutting_items ci ON chi.cuttingItemId = ci.id
      WHERE chi.handoverId = ?
      ORDER BY ci.size, ci.color
    `, firstHandover.id);
    
    console.log(`Items for Handover ${firstHandover.id}:`);
    console.log('=====================================');
    items.forEach((item, i) => {
      console.log(`${i + 1}. Size: ${item.size}, Color: ${item.color}, Qty: ${item.quantity}`);
    });
    
  } catch (error) {
    console.error('Error checking handover records:', error);
  }
}

checkHandoverRecords();