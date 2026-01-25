
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function fixDuplicateUser() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  console.log('Opening database at:', dbPath);

  const db = new sqlite3.Database(dbPath, (err: any) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    }
  });

  const query = (sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(this: any, err: any) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  try {
    console.log('Deleting duplicate user "Megenagna" (ID 2984)...');
    
    // Deleting the user that does NOT match the shop's username case exactly
    // The shop has 'megenagna', so we keep user 'megenagna' (ID 51272)
    // and delete 'Megenagna' (ID 2984)
    
    const result = await query("DELETE FROM users WHERE id = 2984 AND username = 'Megenagna'");
    // @ts-ignore
    if (result.changes > 0) {
        console.log('Successfully deleted duplicate user "Megenagna" (ID 2984).');
    } else {
        console.log('User "Megenagna" (ID 2984) not found or already deleted.');
    }

  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    db.close();
  }
}

fixDuplicateUser();
