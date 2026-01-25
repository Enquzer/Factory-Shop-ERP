import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { tempPassword } = await req.json();
    const userId = params.id;

    if (!tempPassword) {
      return NextResponse.json({ error: 'Temporary password is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user: Set new password, display password, clear pending flag
    await db.run(
      `UPDATE users 
       SET password = ?, 
           tempPasswordDisplay = ?, 
           resetRequestPending = 0 
       WHERE id = ?`,
      [hashedPassword, tempPassword, userId]
    );

    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
