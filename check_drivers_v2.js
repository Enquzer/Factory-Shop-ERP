const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(process.cwd(), 'db', 'carement.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all("SELECT e.employeeId, e.name, d.id as driverId, d.currentLat, d.currentLng, d.status, dept.name as deptName FROM employees e INNER JOIN departments dept ON e.departmentId = dept.id LEFT JOIN drivers d ON e.employeeId = d.employeeId WHERE dept.name = 'Drivers' OR dept.id = 11", (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
    db.close();
  });
});
