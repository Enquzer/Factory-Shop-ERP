import bcrypt from 'bcryptjs';
import { getDb } from './db';

export type User = {
  id: number;
  username: string;
  role: 'factory' | 'shop';
  createdAt: Date;
};

export type AuthResult = {
  success: boolean;
  user?: User;
  message?: string;
};

// Register a new user
export const registerUser = async (
  username: string,
  password: string,
  role: 'factory' | 'shop'
): Promise<AuthResult> => {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Get database connection
    const db = await getDb();
    
    // Insert the user into the database
    const result = await db.run(`
      INSERT INTO users (username, password, role)
      VALUES (?, ?, ?)
    `, username, hashedPassword, role);
    
    return {
      success: true,
      user: {
        id: result.lastID ?? 0,
        username,
        role,
        createdAt: new Date()
      }
    };
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return {
        success: false,
        message: 'Username already exists'
      };
    }
    
    return {
      success: false,
      message: 'Failed to register user'
    };
  }
};

// Authenticate a user
export const authenticateUser = async (
  username: string,
  password: string
): Promise<AuthResult> => {
  try {
    // Get database connection
    const db = await getDb();
    
    // Find the user in the database
    const user = await db.get(`
      SELECT * FROM users WHERE username = ?
    `, username);
    
    if (!user) {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }
    
    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role as 'factory' | 'shop',
        createdAt: new Date(user.created_at)
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Authentication failed'
    };
  }
};

// Get user by ID
export const getUserById = async (id: number): Promise<User | undefined> => {
  try {
    // Get database connection
    const db = await getDb();
    
    const user = await db.get(`
      SELECT * FROM users WHERE id = ?
    `, id);
    
    if (!user) {
      return undefined;
    }
    
    return {
      id: user.id,
      username: user.username,
      role: user.role as 'factory' | 'shop',
      createdAt: new Date(user.created_at)
    };
  } catch (error) {
    return undefined;
  }
};

// Get user by username
export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  try {
    // Get database connection
    const db = await getDb();
    
    const user = await db.get(`
      SELECT * FROM users WHERE username = ?
    `, username);
    
    if (!user) {
      return undefined;
    }
    
    return {
      id: user.id,
      username: user.username,
      role: user.role as 'factory' | 'shop',
      createdAt: new Date(user.created_at)
    };
  } catch (error) {
    return undefined;
  }
};