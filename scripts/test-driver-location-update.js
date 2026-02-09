const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./factory-shop.sqlite');

console.log('Testing driver location update...\n');

// Test location data (Addis Ababa coordinates)
const testLocation = {
  lat: 9.03,
  lng: 38.75,
  lastUpdated: new Date()
};

console.log('Setting test location for driver Motor1...');
console.log('Location data:', testLocation);

// Update driver location
db.run(
  `UPDATE drivers SET currentLat = ?, currentLng = ?, locationLastUpdated = ? WHERE id = ?`,
  [
    testLocation.lat,
    testLocation.lng,
    testLocation.lastUpdated.toISOString(),
    1  // Driver ID
  ],
  function(err) {
    if (err) {
      console.error('Error updating location:', err);
    } else {
      console.log(`✅ Successfully updated ${this.changes} driver(s)`);
      
      // Verify the update
      db.get(
        'SELECT id, name, currentLat, currentLng, locationLastUpdated FROM drivers WHERE id = ?',
        [1],
        (err, row) => {
          if (err) {
            console.error('Error fetching updated driver:', err);
          } else {
            console.log('\nUpdated driver location:');
            console.log(`ID: ${row.id}, Name: ${row.name}`);
            console.log(`Latitude: ${row.currentLat}`);
            console.log(`Longitude: ${row.currentLng}`);
            console.log(`Last Updated: ${row.locationLastUpdated}`);
          }
          
          db.close();
        }
      );
    }
  }
);