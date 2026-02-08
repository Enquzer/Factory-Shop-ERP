import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM drivers');
    return NextResponse.json({ 
      success: true, 
      message: `Cleared ${result.changes} drivers`,
      changes: result.changes
    });
  } catch (error) {
    console.error('Error clearing drivers:', error);
    return NextResponse.json({ error: 'Failed to clear drivers' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const drivers = await db.all('SELECT id, name, employeeId, status FROM drivers');
    return NextResponse.json({ drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}