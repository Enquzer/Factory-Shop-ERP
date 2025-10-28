"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticateUser as authUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getUserById } from '@/lib/auth-sqlite';

type User = {
  id: number;
  username: string;
  role: 'factory' | 'shop';
  profilePictureUrl?: string;
  createdAt: Date;
};

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // New state
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in (from localStorage or session)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoggingIn(true); // Set login loading state
    try {
      const result: AuthResult = await authUser(username, password);
      
      if (result.success && result.user) {
        // Store the token if it exists
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }
        
        // Fetch the complete user data including profile picture
        const fullUser = await getUserById(result.user.id);
        if (fullUser) {
          setUser(fullUser);
          localStorage.setItem('user', JSON.stringify(fullUser));
        } else {
          setUser(result.user);
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: 'An error occurred during login' };
    } finally {
      setIsLoggingIn(false); // Reset login loading state
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    // Redirect to homepage as per user preference
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isLoggingIn }}>
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