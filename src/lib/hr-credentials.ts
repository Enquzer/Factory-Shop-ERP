import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { initializeDriverRole } from './driver-role';

export async function assignCredentialsToEmployee(employeeId: string, username: string, password: string, role: string = 'driver'): Promise<boolean> {
  try {
    const db = await getDB();
    
    // Check if employee exists
    const employee = await db.get('SELECT * FROM employees WHERE employeeId = ?', [employeeId]);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // Initialize driver role if needed
    await initializeDriverRole();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if username already exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Create user account with specified role
    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    
    // Update employee record with user ID reference
    await db.run(
      'UPDATE employees SET userId = ? WHERE employeeId = ?',
      [result.lastID, employeeId]
    );
    
    console.log(`Credentials assigned successfully to employee ${employeeId} with role ${role}`);
    return true;
  } catch (error) {
    console.error('Error assigning credentials:', error);
    throw error;
  }
}

export async function getEmployeeWithoutCredentials(): Promise<any[]> {
  try {
    const db = await getDB();
    const employees = await db.all(`
      SELECT e.*, u.username 
      FROM employees e 
      LEFT JOIN users u ON e.userId = u.id 
      WHERE e.departmentId = 'Drivers' AND u.id IS NULL
    `);
    return employees;
  } catch (error) {
    console.error('Error fetching employees without credentials:', error);
    return [];
  }
}

// Initialize userId column in employees table if it doesn't exist
export async function initializeUserIdColumn() {
  try {
    const db = await getDB();
    
    // Add userId column to employees table if it doesn't exist
    try {
      await db.exec('ALTER TABLE employees ADD COLUMN userId INTEGER REFERENCES users(id)');
    } catch (e) {
      // Column might already exist
      console.log('userId column already exists or error occurred');
    }
    
    console.log('UserId column initialized');
  } catch (error) {
    console.error('Error initializing userId column:', error);
  }
}