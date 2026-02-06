import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRoleAuth } from '@/lib/auth-middleware';

export const DELETE = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const db = await getDb();
    await db.run('DELETE FROM drivers WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Failed to delete driver:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}, 'hr');

export const PUT = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const { name, contact, license_plate } = await request.json();

    if (!name || !contact) {
      return NextResponse.json({ error: 'Name and contact are required' }, { status: 400 });
    }

    const db = await getDb();
    await db.run(
      'UPDATE drivers SET name = ?, contact = ?, license_plate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, contact, license_plate || null, id]
    );

    return NextResponse.json({ message: 'Driver updated successfully' });
  } catch (error) {
    console.error('Failed to update driver:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}, 'hr');
