const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/carement.db');

console.log('Departments:');
db.each('SELECT id, name FROM departments', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`${row.id}: ${row.name}`);
  }
}, () => {
  // Also check what departmentId values exist in employees
  console.log('\nCurrent department assignments:');
  db.each('SELECT DISTINCT departmentId FROM employees WHERE departmentId IS NOT NULL', (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(`departmentId: ${row.departmentId}`);
    }
  }, () => {
    db.close();
  });
});