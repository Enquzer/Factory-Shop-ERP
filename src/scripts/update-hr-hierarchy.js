
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function updateHRHierarchy() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Connected to database. Updating HR schema for hierarchy...');

  try {
    // 1. Create departments table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        managerId TEXT, -- employeeId of the department manager
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add columns to employees table if they don't exist
    const tableInfo = await db.all("PRAGMA table_info(employees)");
    const columnNames = tableInfo.map(c => c.name);

    if (!columnNames.includes('departmentId')) {
      await db.exec("ALTER TABLE employees ADD COLUMN departmentId INTEGER;");
      console.log('Added departmentId column to employees.');
    }

    if (!columnNames.includes('managerId')) {
      await db.exec("ALTER TABLE employees ADD COLUMN managerId TEXT;"); // Reporting to
      console.log('Added managerId column to employees.');
    }

    // 3. Seed some default departments if empty
    const departments = await db.all("SELECT id FROM departments");
    if (departments.length === 0) {
      const defaultDepts = [
        'Management',
        'HR',
        'Production',
        'Cutting',
        'Sewing',
        'Finishing',
        'Packing',
        'Maintenance',
        'Finance'
      ];
      for (const dept of defaultDepts) {
        await db.run("INSERT INTO departments (name) VALUES (?)", [dept]);
      }
      console.log('Seed departments added.');
    }

    console.log('Hierarchy schema update completed successfully.');

  } catch (error) {
    console.error('Error updating HR hierarchy schema:', error);
  } finally {
    await db.close();
  }
}

updateHRHierarchy();
