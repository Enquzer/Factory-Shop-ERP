import bcrypt from 'bcryptjs';
import { getDb } from './db';

export type User = {
  id: number;
  username: string;
  role: 'factory' | 'shop';
  profilePictureUrl?: string;
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
    console.log('Registering user with data:', { username, role });
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');
    
    // Get database connection
    const db = await getDb();
    console.log('Database connection established');
    
    // Insert the user into the database
    const result = await db.run(`
      INSERT INTO users (username, password, role)
      VALUES (?, ?, ?)
    `, username, hashedPassword, role);
    
    console.log('User inserted successfully, result:', result);
    
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
    console.error('=== ERROR IN REGISTER USER ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return {
        success: false,
        message: 'Username already exists'
      };
    }
    
    return {
      success: false,
      message: 'Failed to register user: ' + error.message
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
    
    // For shop users, check if the shop is active
    if (user.role === 'shop') {
      // Import the getShopByUsername function
      const { getShopByUsername } = await import('./shops-sqlite');
      
      // Get the shop associated with this username
      const shop = await getShopByUsername(username);
      
      // If shop doesn't exist or is not active, deny login
      if (!shop || shop.status !== 'Active') {
        return {
          success: false,
          message: 'Shop account is not active. Please contact administrator.'
        };
      }
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role as 'factory' | 'shop',
        profilePictureUrl: user.profilePictureUrl,
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
      profilePictureUrl: user.profilePictureUrl,
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
      profilePictureUrl: user.profilePictureUrl,
      createdAt: new Date(user.created_at)
    };
  } catch (error) {
    return undefined;
  }
};

// Update user profile picture
export const updateUserProfilePicture = async (
  userId: number,
  profilePictureUrl: string
): Promise<boolean> => {
  try {
    // Get database connection
    const db = await getDb();
    
    // Update the user's profile picture URL
    await db.run(`
      UPDATE users SET profilePictureUrl = ? WHERE id = ?
    `, profilePictureUrl, userId);
    
    return true;
  } catch (error) {
    console.error('Error updating user profile picture:', error);
    return false;
  }
};

// Delete user by username
export const deleteUserByUsername = async (username: string): Promise<boolean> => {
  try {
    // Get database connection
    const db = await getDb();
    
    // Delete the user from the database
    const result = await db.run(`
      DELETE FROM users WHERE username = ?
    `, username);
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
};
