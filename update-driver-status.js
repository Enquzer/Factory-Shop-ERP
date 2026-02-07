// Direct database update to make Motor1 driver available
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

console.log('=== UPDATING DRIVER STATUS ===');

// Update Motor1 driver status to available
db.run("UPDATE drivers SET status = 'available' WHERE username = 'Motor1'", function(err) {
  if (err) {
    console.error('Error updating driver status:', err.message);
  } else {
    console.log('✓ Driver status updated successfully');
    console.log('Rows affected:', this.changes);
  }
  
  // Verify the update
  db.get("SELECT id, username, status, vehicle_type FROM drivers WHERE username = 'Motor1'", (err, row) => {
    if (err) {
      console.error('Error querying driver:', err.message);
    } else {
      console.log('Updated driver record:', row);
    }
    
    // Close database
    db.close();
    console.log('=== UPDATE COMPLETE ===');
  });
});