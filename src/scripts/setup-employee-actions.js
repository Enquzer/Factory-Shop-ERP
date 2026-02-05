
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupEmployeeActions() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Setting up Employee Actions & Discipline Tables...');

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS employee_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        actionType TEXT NOT NULL, -- Warning, Reward, Promotion, Demotion
        title TEXT NOT NULL,
        description TEXT,
        oldPosition TEXT,
        newPosition TEXT,
        oldSalary REAL,
        newSalary REAL,
        effectiveDate TEXT NOT NULL,
        issuedBy TEXT,
        status TEXT DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId)
      );
    `);

    console.log('Employee Actions table setup successfully.');
  } catch (error) {
    console.error('Error setting up Employee Actions:', error);
  } finally {
    await db.close();
  }
}

setupEmployeeActions();
