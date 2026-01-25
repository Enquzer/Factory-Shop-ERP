const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fix() {
  const dbPath = path.join(process.cwd(), 'db', 'carement.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const columns = [
    'sewingStatus', 'finishingStatus', 'qualityInspectionStatus', 'packingStatus', 'deliveryStatus',
    'planningCompletionDate', 'sampleCompletionDate', 'cuttingCompletionDate', 'sewingCompletionDate', 
    'finishingCompletionDate', 'qualityInspectionCompletionDate', 'packingCompletionDate', 'deliveryCompletionDate',
    'isPlanningApproved', 'piecesPerSet'
  ];

  for (const column of columns) {
    try {
      const type = column.includes('isPlanningApproved') || column.includes('piecesPerSet') ? 'INTEGER' : 'TEXT';
      await db.exec(`ALTER TABLE marketing_orders ADD COLUMN ${column} ${type}`);
      console.log(`Added ${column}`);
    } catch (e) {
      console.log(`${column} already exists`);
    }
  }

  process.exit(0);
}

fix();
