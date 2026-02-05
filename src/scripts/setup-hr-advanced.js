
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupHRAdvancedSettings() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Configuring Advanced HR Settings...');

  try {
    // 1. Tax Brackets
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tax_brackets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        minSalary REAL NOT NULL,
        maxSalary REAL, -- NULL for the top bracket
        rate REAL NOT NULL, -- as decimal, e.g., 0.1 for 10%
        deduction REAL DEFAULT 0,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default Ethiopian tax brackets if empty
    const existingBrackets = await db.get('SELECT count(*) as count FROM tax_brackets');
    if (existingBrackets.count === 0) {
      const defaultBrackets = [
        [0, 600, 0, 0],
        [601, 1650, 0.1, 60],
        [1651, 3200, 0.15, 142.5],
        [3201, 5250, 0.20, 302.5],
        [5251, 7800, 0.25, 565],
        [7801, 10900, 0.30, 955],
        [10901, null, 0.35, 1500]
      ];
      for (const [min, max, rate, ded] of defaultBrackets) {
        await db.run('INSERT INTO tax_brackets (minSalary, maxSalary, rate, deduction) VALUES (?, ?, ?, ?)', [min, max, rate, ded]);
      }
    }

    // 2. Global HR Settings (Pension)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS hr_global_settings (
        settingKey TEXT PRIMARY KEY,
        settingValue TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const defaultSettings = [
      ['pension_employee_pct', '0.07'],
      ['pension_employer_pct', '0.11'],
      ['working_days_per_month', '26']
    ];
    for (const [key, val] of defaultSettings) {
      await db.run('INSERT OR IGNORE INTO hr_global_settings (settingKey, settingValue) VALUES (?, ?)', [key, val]);
    }

    // 3. Salary History
    await db.exec(`
      CREATE TABLE IF NOT EXISTS salary_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        oldSalary REAL NOT NULL,
        newSalary REAL NOT NULL,
        changeType TEXT NOT NULL, -- Increment, Demotion, Initial
        effectiveDate TEXT NOT NULL,
        basis TEXT DEFAULT 'Gross', -- Gross or Net
        reason TEXT,
        executedBy TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId)
      );
    `);

    console.log('Advanced HR Settings configured successfully.');

  } catch (error) {
    console.error('Error setting up Advanced HR:', error);
  } finally {
    await db.close();
  }
}

setupHRAdvancedSettings();
