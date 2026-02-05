
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function updateSchema() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  try {
    const columns = await db.all("PRAGMA table_info(employee_assignments)");
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('componentName')) {
      await db.exec(`ALTER TABLE employee_assignments ADD COLUMN componentName TEXT`);
      console.log('Added componentName to employee_assignments');
    } else {
      console.log('componentName already exists in employee_assignments');
    }
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await db.close();
  }
}

updateSchema();
