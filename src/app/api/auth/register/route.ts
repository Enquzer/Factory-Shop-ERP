import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth-sqlite';
import { AuthResult } from '@/lib/auth-sqlite';

// POST /api/auth/register - Register a new user
export async function POST(request: Request) {
  try {
    const { username, password, role } = await request.json();
    
    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Username, password, and role are required' }, { status: 400 });
    }
    
    const result: AuthResult = await registerUser(username, password, role);
    
    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}