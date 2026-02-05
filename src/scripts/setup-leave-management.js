
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupLeaveManagement() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Adding Leave Management tables...');

  try {
    // 1. Create leaves table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        leaveType TEXT NOT NULL, -- Annual, Sick, Maternity, Paternity, Unpaid, Compassionate
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        totalDays REAL NOT NULL,
        isPaid BOOLEAN DEFAULT 1,
        month TEXT NOT NULL, -- YYYY-MM for payroll inclusion
        reason TEXT,
        status TEXT DEFAULT 'Approved',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId)
      );
    `);

    // 2. Add leaveBalance to employees if it doesn't exist
    const columns = await db.all("PRAGMA table_info(employees)");
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('leaveBalance')) {
      await db.exec(`ALTER TABLE employees ADD COLUMN leaveBalance REAL DEFAULT 14.0`);
    }

    console.log('Leave Management tables and columns added successfully.');

  } catch (error) {
    console.error('Error setting up Leave Management:', error);
  } finally {
    await db.close();
  }
}

setupLeaveManagement();
