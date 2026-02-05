
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function upgradeHR() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Upgrading HR module...');

  try {
    // 1. Add new columns to employees
    const columns = await db.all("PRAGMA table_info(employees)");
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('promotionTrack')) {
      await db.exec(`ALTER TABLE employees ADD COLUMN promotionTrack TEXT`);
    }
    if (!columnNames.includes('trainingHistory')) {
      await db.exec(`ALTER TABLE employees ADD COLUMN trainingHistory TEXT`);
    }
    if (!columnNames.includes('examHistory')) {
      await db.exec(`ALTER TABLE employees ADD COLUMN examHistory TEXT`);
    }
    if (!columnNames.includes('pensionOptOut')) {
      await db.exec(`ALTER TABLE employees ADD COLUMN pensionOptOut BOOLEAN DEFAULT 0`);
    }
    if (!columnNames.includes('loyaltyStatus')) {
      await db.exec(`ALTER TABLE employees ADD COLUMN loyaltyStatus TEXT DEFAULT 'Good'`);
    }

    // 2. Create Attendance table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'Present',
        checkIn TEXT,
        checkOut TEXT,
        otHours REAL DEFAULT 0,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId),
        UNIQUE(employeeId, date)
      );
    `);

    // 3. Create Payroll Records table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        month TEXT NOT NULL, -- YYYY-MM
        baseSalary REAL NOT NULL,
        otPay REAL DEFAULT 0,
        incentiveBonus REAL DEFAULT 0,
        disciplinaryFines REAL DEFAULT 0,
        taxPayable REAL DEFAULT 0,
        pensionEmployee REAL DEFAULT 0,
        pensionEmployer REAL DEFAULT 0,
        otherDeductions REAL DEFAULT 0,
        netSalary REAL NOT NULL,
        status TEXT DEFAULT 'Draft',
        processedAt DATETIME,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId),
        UNIQUE(employeeId, month)
      );
    `);

    // 4. Create Product Category Bonus Rates
    await db.exec(`
      CREATE TABLE IF NOT EXISTS product_category_bonuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT UNIQUE NOT NULL,
        bonusPerPiece REAL NOT NULL
      );
    `);

    // Seed data
    const multipliers = [
      ['Garment Production managers', 2.0],
      ['Line supervisors', 1.5],
      ['Mechanic', 1.5],
      ['Cutting operators', 1.3],
      ['Packing operators', 0.8],
      ['Floor cleaners', 0.6]
    ];

    const categoryBonuses = [
      ['Polo T-Shirt', 0.31],
      ['T-Shirt', 0.23],
      ['Denim Kid\'s Short', 0.20],
      ['Boxer', 0.12],
      ['Legging (Tights)', 0.06],
      ['Pack Out', 0.02]
    ];

    for (const [cat, rate] of categoryBonuses) {
      await db.run('INSERT OR IGNORE INTO product_category_bonuses (category, bonusPerPiece) VALUES (?, ?)', [cat, rate]);
    }

    console.log('HR & Payroll schema upgraded successfully.');

  } catch (error) {
    console.error('Error upgrading HR:', error);
  } finally {
    await db.close();
  }
}

upgradeHR();
