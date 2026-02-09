const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

console.log('🔧 Setting up driver location for map testing...\n');

// Set a test location for Motor1 driver (Addis Ababa coordinates)
const testLocation = {
  lat: 9.03,
  lng: 38.75,
  lastUpdated: new Date()
};

console.log('📍 Setting test location for Motor1 driver:');
console.log(`   Latitude: ${testLocation.lat}`);
console.log(`   Longitude: ${testLocation.lng}`);
console.log(`   Time: ${testLocation.lastUpdated.toISOString()}`);

// Update the driver's location in the database
db.run(
  `UPDATE drivers SET currentLat = ?, currentLng = ?, locationLastUpdated = ? WHERE name = 'Motor1'`,
  [
    testLocation.lat,
    testLocation.lng,
    testLocation.lastUpdated.toISOString()
  ],
  function(err) {
    if (err) {
      console.error('❌ Error updating driver location:', err);
    } else {
      console.log(`✅ Successfully updated driver location (${this.changes} row(s) affected)`);
      
      // Verify the update
      db.get(
        `SELECT id, name, currentLat, currentLng, locationLastUpdated FROM drivers WHERE name = 'Motor1'`,
        [],
        (err, row) => {
          if (err) {
            console.error('❌ Error verifying update:', err);
          } else {
            console.log('\n📋 Updated driver data:');
            console.log(`   ID: ${row.id}`);
            console.log(`   Name: ${row.name}`);
            console.log(`   Current Latitude: ${row.currentLat}`);
            console.log(`   Current Longitude: ${row.currentLng}`);
            console.log(`   Last Updated: ${row.locationLastUpdated}`);
            
            console.log('\n🚀 Driver location is now set!');
            console.log('   You should now see the blue driver marker on the map at:');
            console.log(`   https://localhost:3000/driver/dashboard`);
          }
          
          db.close();
        }
      );
    }
  }
);