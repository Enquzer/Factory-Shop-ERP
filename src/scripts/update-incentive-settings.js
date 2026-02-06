
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupIncentiveSettings() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  try {
    console.log('Creating job_center_settings table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS job_center_settings (
        jobCenter TEXT PRIMARY KEY,
        multiplier REAL DEFAULT 0,
        settings JSON DEFAULT '{}'
      )
    `);

    const defaults = {
      "Garment Production managers": 2.0,
      "Line supervisors": 1.5,
      "Mechanic": 1.5,
      "Cutting operators": 1.3,
      "Spreading operators": 1.1,
      "Printing operators": 1.0,
      "Trimers": 0.8,
      "Ironing operators": 0.8,
      "Packing operators": 0.8,
      "Sewing operator helpers": 0.7,
      "Floor cleaners": 0.6,
      "Sewing machine operator": 1.0
    };

    console.log('Seeding default multipliers...');
    for (const [center, mult] of Object.entries(defaults)) {
      await db.run(
        `INSERT INTO job_center_settings (jobCenter, multiplier) VALUES (?, ?) 
         ON CONFLICT(jobCenter) DO UPDATE SET multiplier = excluded.multiplier`,
        [center, mult]
      );
    }
    
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.close();
  }
}

setupIncentiveSettings();
