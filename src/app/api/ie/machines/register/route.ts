import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';

// POST /api/ie/machines/register - Register a new machine
export const POST = withRoleAuth(async (request) => {
  try {
    const body = await request.json();
    const { 
      machineCode, 
      machineName, 
      machineType, 
      category, 
      brand, 
      model, 
      serialNumber, 
      purchaseDate, 
      warrantyExpiry, 
      supplier, 
      cost, 
      section, 
      capacity, 
      status, 
      description 
    } = body;

    // Validation
    if (!machineCode || !machineName || !category) {
      return NextResponse.json(
        { error: 'Machine Code, Machine Name, and Category are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if machine code already exists
    const existingMachine = await db.get(
      'SELECT id FROM machines WHERE machineCode = ?',
      machineCode
    );

    if (existingMachine) {
      return NextResponse.json(
        { error: 'Machine with this code already exists' },
        { status: 400 }
      );
    }

    // Insert the new machine
    const result = await db.run(
      `INSERT INTO machines (
        machineCode, machineName, machineType, category, brand, model, 
        serialNumber, purchaseDate, warrantyExpiry, supplier, cost, 
        section, capacity, status, description, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        machineCode,
        machineName,
        machineType || '',
        category,
        brand || '',
        model || '',
        serialNumber || '',
        purchaseDate || null,
        warrantyExpiry || null,
        supplier || '',
        cost || 0,
        section || '',
        capacity || 0,
        status || 'Available',
        description || ''
      ]
    );

    const newMachineId = result.lastID;

    return NextResponse.json({
      success: true,
      id: newMachineId,
      message: 'Machine registered successfully'
    });

  } catch (error: any) {
    console.error('Error registering machine:', error);
    return NextResponse.json(
      { error: 'Failed to register machine: ' + error.message },
      { status: 500 }
    );
  }
}, 'ie_admin');