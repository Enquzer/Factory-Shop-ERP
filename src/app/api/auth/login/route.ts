import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth-sqlite';
import { AuthResult } from '@/lib/auth-sqlite';

// POST /api/auth/login - Authenticate a user
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }
    
    const result: AuthResult = await authenticateUser(username, password);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 401 });
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
    return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 500 });
  }
}