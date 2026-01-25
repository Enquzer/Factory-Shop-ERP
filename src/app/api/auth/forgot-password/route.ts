import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if user exists
    const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);

    if (!user) {
      // For security, do not reveal if user does not exist
      return NextResponse.json({ message: 'If the account exists, a reset request has been sent.' });
    }

    // Update user to have resetRequestPending = 1
    await db.run('UPDATE users SET resetRequestPending = 1 WHERE username = ?', [username]);

    return NextResponse.json({ success: true, message: 'Password reset request sent successfully.' });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
