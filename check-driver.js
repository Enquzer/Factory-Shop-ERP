const { db } = require('./src/lib/db');

// Check if Motor1 user exists
const user = db.prepare('SELECT * FROM users WHERE username = ?').get('Motor1');
console.log('User Motor1:', user);

// Check for employees with "Motor" in name
const employees = db.prepare("SELECT * FROM employees WHERE first_name LIKE '%Motor%' OR last_name LIKE '%Motor%' OR first_name LIKE '%motor%' OR last_name LIKE '%motor%'").all();
console.log('Employees with Motor in name:', employees);

// Check all employees in Drivers department
const driversDept = db.prepare("SELECT * FROM employees WHERE department = 'Drivers'").all();
console.log('Employees in Drivers department:', driversDept);

// Check if any drivers exist
const drivers = db.prepare('SELECT * FROM drivers').all();
console.log('Existing drivers:', drivers);