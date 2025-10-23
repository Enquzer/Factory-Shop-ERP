import { NextResponse } from 'next/server';
import { getUserById, getUserByUsername } from '../../../lib/auth-sqlite';
import { User } from '../../../lib/auth-sqlite';

// GET /api/auth/user - Get user by ID or username
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const username = searchParams.get('username');
    
    let user: User | undefined;
    
    if (id) {
      user = await getUserById(parseInt(id));
    } else if (username) {
      user = await getUserByUsername(username);
    } else {
      return NextResponse.json({ error: 'ID or username is required' }, { status: 400 });
    }
    
    if (user) {
      return NextResponse.json(user);
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}