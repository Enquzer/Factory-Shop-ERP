const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('Testing receiving voucher functionality...\n');

// Check if the new table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='finished_goods_receiving_vouchers'", (err, row) => {
  if (err) {
    console.error('Error checking table:', err.message);
  } else if (row) {
    console.log('✓ finished_goods_receiving_vouchers table exists');
  } else {
    console.log('✗ finished_goods_receiving_vouchers table does not exist');
  }
});

// Check if the new columns exist in marketing_orders
db.all("PRAGMA table_info(marketing_orders)", (err, columns) => {
  if (err) {
    console.error('Error checking columns:', err.message);
  } else {
    const voucherColumns = columns.filter(col => 
      col.name.includes('receivingVoucher')
    );
    
    if (voucherColumns.length > 0) {
      console.log('✓ Receiving voucher columns exist in marketing_orders:');
      voucherColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    } else {
      console.log('✗ Receiving voucher columns not found in marketing_orders');
    }
  }
});

// Check if the sequence exists
db.get("SELECT * FROM pad_number_sequences WHERE type='receiving'", (err, row) => {
  if (err) {
    console.error('Error checking sequence:', err.message);
  } else if (row) {
    console.log('✓ Receiving voucher sequence exists:');
    console.log(`  - Prefix: ${row.prefix}`);
    console.log(`  - Format: ${row.format}`);
    console.log(`  - Current sequence: ${row.currentSequence}`);
  } else {
    console.log('✗ Receiving voucher sequence not found');
  }
});

// Close database connection
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\nReceiving voucher test completed!');
    }
  });
}, 1000);