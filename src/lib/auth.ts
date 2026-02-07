export type User = {
  id: number;
  username: string;
  role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin' | 'ie_admin' | 'ie_user' | 'designer' | 'customer' | 'hr' | 'ecommerce' | 'driver';
  profilePictureUrl?: string;
  createdAt: Date;
};

export type AuthResult = {
  success: boolean;
  user?: User;
  message?: string;
  token?: string;
};

// Client-side functions that call the API
export const registerUser = async (
  username: string,
  password: string,
  role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin' | 'driver'
): Promise<AuthResult> => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, role }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    // Error registering user
    return {
      success: false,
      message: 'Failed to register user'
    };
  }
};

export const authenticateUser = async (
  username: string,
  password: string
): Promise<AuthResult> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    // Error authenticating user
    return {
      success: false,
      message: 'Authentication failed'
    };
  }
};

export const getUserById = async (id: number): Promise<User | undefined> => {
  try {
    const response = await fetch(`/api/auth/user?id=${id}`);
    
    if (!response.ok) {
      return undefined;
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    // Error fetching user
    return undefined;
  }
};

export const getUserByUsername = async (username: string): Promise<User | undefined> => {
  try {
    const response = await fetch(`/api/auth/user?username=${username}`);
    
    if (!response.ok) {
      return undefined;
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    // Error fetching user
    return undefined;
  }
};