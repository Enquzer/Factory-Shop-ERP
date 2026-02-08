const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/carement.db');

db.serialize(() => {
  console.log('Clearing drivers table...');
  db.run('DELETE FROM drivers', function(err) {
    if (err) {
      console.error('Error clearing drivers:', err);
    } else {
      console.log(`Cleared ${this.changes} driver records`);
    }
    
    console.log('Current drivers:');
    db.each('SELECT id, name, employeeId, status FROM drivers', (err, row) => {
      if (err) {
        console.error('Error querying drivers:', err);
      } else {
        console.log(row);
      }
    }, () => {
      db.close();
    });
  });
});