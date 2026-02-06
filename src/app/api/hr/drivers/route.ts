import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRoleAuth } from '@/lib/auth-middleware';

export const GET = withRoleAuth(async (request: NextRequest) => {
  try {
    const db = await getDb();
    const drivers = await db.all('SELECT * FROM drivers ORDER BY name ASC');
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Failed to fetch drivers:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}, 'hr');

export const POST = withRoleAuth(async (request: NextRequest) => {
  try {
    const { name, contact, license_plate } = await request.json();

    if (!name || !contact) {
      return NextResponse.json({ error: 'Name and contact are required' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO drivers (name, contact, license_plate) VALUES (?, ?, ?)',
      [name, contact, license_plate || null]
    );

    return NextResponse.json({ 
      id: result.lastID, 
      name, 
      contact, 
      license_plate 
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create driver:', error);
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}, 'hr');
