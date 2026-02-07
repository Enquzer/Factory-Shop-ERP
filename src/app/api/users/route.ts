import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/users - Get all users (for HR to map userId to usernames)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = await getDB();
    const users = await db.all('SELECT id, username, role FROM users ORDER BY username');
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('API Users GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}