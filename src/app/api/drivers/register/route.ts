import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only HR, admin, and ecommerce can register drivers
    if (!['hr', 'admin', 'ecommerce'].includes(authResult.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { employeeId, vehicleType, licensePlate, contactPhone } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Check if employee exists
    const db = await getDb();
    const employee = await db.get('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if driver already exists (by name or employee ID)
    const existingDriver = await db.get('SELECT * FROM drivers WHERE name = ? OR employeeId = ?', [employee.name, employeeId.toString()]);
    if (existingDriver) {
      return NextResponse.json({ 
        error: existingDriver.name === employee.name ? 
          'Driver with this name already exists' : 
          'This employee is already registered as a driver',
        existingDriver: {
          id: existingDriver.id,
          name: existingDriver.name,
          status: existingDriver.status
        }
      }, { status: 409 });
    }

    // Create driver record
    // Based on the actual database schema
    const result = await db.run(`
      INSERT INTO drivers (name, phone, contact, license_plate, vehicleType, status, employeeId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employee.name, contactPhone || employee.phone, contactPhone || employee.phone, licensePlate || '', vehicleType || 'motorbike', 'available', employeeId.toString()]);

    // TODO: Update employee department to Drivers department
    // Need to find the correct departmentId for "Drivers" department
    // await db.run('UPDATE employees SET departmentId = ? WHERE id = ?', [driversDepartmentId, employeeId]);

    const newDriver = await db.get('SELECT * FROM drivers WHERE rowid = ?', [result.lastID]);

    return NextResponse.json({ 
      success: true, 
      driver: newDriver,
      message: 'Driver registered successfully'
    });

  } catch (error) {
    console.error('Error registering driver:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only HR and admin can view all drivers
    if (!['hr', 'admin'].includes(authResult.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = await getDb();
    const drivers = await db.all(`
      SELECT d.*, e.name as employeeName, e.phone as employeePhone, e.jobCenter
      FROM drivers d
      JOIN employees e ON d.employeeId = e.id
      ORDER BY d.name DESC
    `);

    return NextResponse.json({ drivers });

  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}