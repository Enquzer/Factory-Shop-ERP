
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupTrainingSessions() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Setting up Training Sessions Tables...');

  try {
    // 1. Training Sessions (Scheduled instances of modules)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS training_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        moduleId INTEGER NOT NULL,
        startDateTime TEXT NOT NULL,
        endDateTime TEXT,
        location TEXT,
        instructor TEXT,
        capacity INTEGER,
        status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (moduleId) REFERENCES training_modules(id)
      );
    `);

    // 2. Session Attendees (Who is registered/attended specific session)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS training_session_attendees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId INTEGER NOT NULL,
        employeeId TEXT NOT NULL,
        status TEXT DEFAULT 'Registered', -- Registered, Attended, Absent
        remarks TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES training_sessions(id),
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId)
      );
    `);

    console.log('Training Sessions setup successfully.');
  } catch (error) {
    console.error('Error setting up Training Sessions:', error);
  } finally {
    await db.close();
  }
}

setupTrainingSessions();
