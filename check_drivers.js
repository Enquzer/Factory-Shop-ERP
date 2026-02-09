const { getDB } = require('./src/lib/db');

async function check() {
  const db = await getDB();
  const employees = await db.all("SELECT e.employeeId, e.name, d.id as driverId, d.currentLat, d.currentLng, dept.name as deptName FROM employees e INNER JOIN departments dept ON e.departmentId = dept.id LEFT JOIN drivers d ON e.employeeId = d.employeeId WHERE dept.name = 'Drivers' OR dept.id = 11");
  console.log(JSON.stringify(employees, null, 2));
}

check();
