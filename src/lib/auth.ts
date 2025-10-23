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

// Client-side functions that call the API
export const registerUser = async (
  username: string,
  password: string,
  role: 'factory' | 'shop'
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
    console.error('Error registering user:', error);
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
    console.error('Error authenticating user:', error);
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
    console.error('Error fetching user:', error);
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
    console.error('Error fetching user:', error);
    return undefined;
  }
};