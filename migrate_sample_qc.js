
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Creating sample inspection tables...');
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sample_inspections (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      styleId TEXT,
      sampleType TEXT NOT NULL, -- 'Size Set' or 'Counter'
      status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Passed', 'Failed'
      requestDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      inspectionDate DATETIME,
      inspectorId INTEGER,
      physicalPictures TEXT, -- JSON array of URLs
      comments TEXT,
      pdfReportUrl TEXT,
      fullBOMJson TEXT, -- Snapshot of BOM at request time
      techpackUrl TEXT,
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS sample_measurements (
      id TEXT PRIMARY KEY,
      inspectionId TEXT NOT NULL,
      pom TEXT NOT NULL, -- Point of Measurement
      designerMeasurement REAL,
      tolerance REAL,
      actualMeasurement REAL,
      variance REAL,
      status TEXT, -- 'Pass', 'Within Tolerance', 'Fail'
      FOREIGN KEY (inspectionId) REFERENCES sample_inspections(id)
    );
  `);

  console.log('Tables created.');
  await db.close();
}

migrate().catch(console.error);
