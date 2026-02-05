
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function setupTrainingAndExams() {
  const db = await open({
    filename: path.join(process.cwd(), 'db', 'carement.db'),
    driver: sqlite3.Database
  });

  console.log('Setting up Training & Exams Tables...');

  try {
    // 1. Training Modules Catalog
    await db.exec(`
      CREATE TABLE IF NOT EXISTS training_modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        department TEXT,
        durationDays INTEGER,
        category TEXT, -- Soft Skill, Technical, Safety, etc.
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Employee Training Progress
    await db.exec(`
      CREATE TABLE IF NOT EXISTS employee_training (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        moduleId INTEGER NOT NULL,
        status TEXT DEFAULT 'Enrolled', -- Enrolled, In Progress, Completed, Failed
        startDate TEXT,
        completionDate TEXT,
        score REAL,
        instructor TEXT,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId),
        FOREIGN KEY (moduleId) REFERENCES training_modules(id)
      );
    `);

    // 3. Exams & Certifications Catalog
    await db.exec(`
      CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        examType TEXT, -- Practical, Written, Certification
        passingScore REAL DEFAULT 50,
        validityMonths INTEGER, -- How long the certification lasts
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Employee Exam Results
    await db.exec(`
      CREATE TABLE IF NOT EXISTS employee_exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        examId INTEGER NOT NULL,
        examDate TEXT NOT NULL,
        score REAL NOT NULL,
        result TEXT, -- Pass/Fail
        certificateUrl TEXT,
        expiryDate TEXT,
        FOREIGN KEY (employeeId) REFERENCES employees(employeeId),
        FOREIGN KEY (examId) REFERENCES exams(id)
      );
    `);

    // Seed some initial modules if empty
    const checkModules = await db.get('SELECT count(*) as count FROM training_modules');
    if (checkModules.count === 0) {
      const defaultModules = [
        ['Lean Manufacturing 101', 'Basics of 5S and waste reduction.', 'Production', 2, 'Technical'],
        ['Safety & Emergency Response', 'Fire safety and first aid basics.', 'General', 1, 'Safety'],
        ['Advanced Overlock Operation', 'Mastering high-speed overlock machines.', 'Sewing', 5, 'Technical'],
        ['Team Leadership', 'Basic management skills for line supervisors.', 'HR', 3, 'Soft Skill']
      ];
      for (const [title, desc, dept, days, cat] of defaultModules) {
        await db.run('INSERT INTO training_modules (title, description, department, durationDays, category) VALUES (?, ?, ?, ?, ?)', [title, desc, dept, days, cat]);
      }
    }

    const checkExams = await db.get('SELECT count(*) as count FROM exams');
    if (checkExams.count === 0) {
      const defaultExams = [
        ['Grade A Operator Practical', 'Practical assessment of sewing speed and quality.', 'Practical', 85, 12],
        ['Basic Safety Certification', 'Written exam on factory safety protocols.', 'Certification', 70, 24],
        ['Quality Inspector Proficiency', 'Assessment for end-of-line inspectors.', 'Written', 80, 12]
      ];
      for (const [title, type, pass, valid] of defaultExams) {
        await db.run('INSERT INTO exams (title, examType, passingScore, validityMonths) VALUES (?, ?, ?, ?)', [title, type, pass, valid]);
      }
    }

    console.log('Training & Exams setup successfully.');
  } catch (error) {
    console.error('Error setting up Training & Exams:', error);
  } finally {
    await db.close();
  }
}

setupTrainingAndExams();
