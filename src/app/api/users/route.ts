import { NextResponse } from 'next/server';
import { withAuth, withRoleAuth } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';

// Define the User type
type User = {
  id: number;
  username: string;
  role: string;
  profilePictureUrl?: string;
  createdAt: Date;
};

// GET /api/users - Get all users for factory management
export const GET = withRoleAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role') as 'factory' | 'shop' | 'store' | 'finance' | null;

    const db = await getDb();
    
    let query = `SELECT id, username, role, profilePictureUrl, resetRequestPending, tempPasswordDisplay, created_at as createdAt FROM users`;
    const params: any[] = [];

    if (roleFilter) {
      query += ` WHERE role = ?`;
      params.push(roleFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const users = params.length > 0 ? await db.all(query, params) : await db.all(query);
    
    const formattedUsers = users.map((user: any) => ({
      ...user,
      createdAt: new Date(user.createdAt)
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}, 'factory');

// POST /api/users - Create a new user
export const POST = withRoleAuth(async (request: Request) => {
  try {
    const { username, password, role } = await request.json();
    
    // Validate input
    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Username, password, and role are required' }, { status: 400 });
    }

    // Validate role
    const validRoles: string[] = ['factory', 'shop', 'store', 'finance', 'planning', 'sample_maker', 'cutting', 'sewing', 'finishing', 'packing', 'quality_inspection'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if user already exists
    const existingUser = await db.get(`SELECT 1 FROM users WHERE username = ?`, [username]);
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Hash the password
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const result = await db.run(
      `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
      [username, hashedPassword, role]
    );

    return NextResponse.json({ 
      id: result.lastID,
      username,
      role,
      message: 'User created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}, 'factory');

// DELETE /api/users - Delete a user
export const DELETE = withRoleAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Don't allow deletion of the main factory user
    if (userId === '1') {
      return NextResponse.json({ error: 'Cannot delete main factory user' }, { status: 400 });
    }

    const db = await getDb();
    
    const result = await db.run(`DELETE FROM users WHERE id = ?`, [userId]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}, 'factory');