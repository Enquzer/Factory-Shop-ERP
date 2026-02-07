import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only HR, admin, and ecommerce can register drivers
    if (!['hr', 'admin', 'ecommerce'].includes(authResult.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { username, employeeId, vehicleType, licensePlate, contactPhone } = body;

    if (!username || !employeeId) {
      return NextResponse.json({ error: 'Username and employee ID are required' }, { status: 400 });
    }

    // Check if employee exists
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if driver already exists
    const existingDriver = db.prepare('SELECT * FROM drivers WHERE username = ?').get(username);
    if (existingDriver) {
      return NextResponse.json({ error: 'Driver with this username already exists' }, { status: 409 });
    }

    // Create driver record
    const result = db.prepare(`
      INSERT INTO drivers (username, employee_id, vehicle_type, license_plate, contact_phone, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(username, employeeId, vehicleType || 'motorcycle', licensePlate || '', contactPhone || employee.phone, authResult.username);

    // Update employee department to Drivers if not already
    db.prepare('UPDATE employees SET department = ? WHERE id = ?').run('Drivers', employeeId);

    const newDriver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid);

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
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only HR and admin can view all drivers
    if (!['hr', 'admin'].includes(authResult.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const drivers = db.prepare(`
      SELECT d.*, e.first_name, e.last_name, e.phone, e.department
      FROM drivers d
      JOIN employees e ON d.employee_id = e.id
      ORDER BY d.created_at DESC
    `).all();

    return NextResponse.json({ drivers });

  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}