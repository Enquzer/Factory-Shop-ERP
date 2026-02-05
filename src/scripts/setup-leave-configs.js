
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupLeaveConfigs() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Setting up Leave Configs...');

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS leave_configs (
        leaveType TEXT PRIMARY KEY,
        isPaid BOOLEAN DEFAULT 1,
        deductionFactor REAL DEFAULT 0.0, -- 1.0 means deduct full day from salary, 0.0 means no deduction
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const defaultConfigs = [
      ['Annual', 1, 0.0],
      ['Sick', 1, 0.0],
      ['Maternity', 1, 0.0],
      ['Paternity', 1, 0.0],
      ['Compassionate', 1, 0.0],
      ['Unpaid', 0, 1.0],
      ['Disciplinary', 0, 1.0]
    ];

    for (const [type, paid, factor] of defaultConfigs) {
      await db.run('INSERT OR IGNORE INTO leave_configs (leaveType, isPaid, deductionFactor) VALUES (?, ?, ?)', [type, paid, factor]);
    }

    console.log('Leave Configs setup successfully.');
  } catch (error) {
    console.error('Error setting up Leave Configs:', error);
  } finally {
    await db.close();
  }
}

setupLeaveConfigs();
