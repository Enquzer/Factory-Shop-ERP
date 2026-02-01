"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticateUser as authUser, type User } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type AuthResult = {
  success: boolean;
  user?: User;
  message?: string;
  token?: string;
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
  isLoggingIn: boolean; // New state for login process
  token: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // New state
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in (from localStorage or session)
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    
    if (storedToken) {
      setToken(storedToken);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoggingIn(true); // Set login loading state
    try {
      console.log('Attempting login for:', username);
      const result: AuthResult = await authUser(username, password);
      console.log('Login result:', result);
      
      if (result.success && result.user) {
        // Store the token if it exists
        if (result.token) {
          localStorage.setItem('authToken', result.token);
          setToken(result.token);
        }
        
        // Use the user data directly from the response
        setUser(result.user);
        localStorage.setItem('user', JSON.stringify(result.user));
        console.log('User set successfully:', result.user);
        
        return { success: true };
      } else {
        console.log('Login failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    } finally {
      setIsLoggingIn(false); // Reset login loading state
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    // Redirect to homepage as per user preference
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, isLoggingIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}