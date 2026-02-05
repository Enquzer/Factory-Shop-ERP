"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authenticateUser as authUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface CustomerUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer';
  phone: string;
  deliveryAddress: string;
  city: string;
  preferredShopId?: string;
  createdAt: Date;
  updatedAt: Date;
};

type AuthResult = {
  success: boolean;
  user?: CustomerUser;
  message?: string;
  token?: string;
};

interface CustomerAuthContextType {
  user: CustomerUser | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
  isLoggingIn: boolean;
  register: (customerData: any) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if customer is already logged in
    const storedUser = localStorage.getItem('customerUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored customer user', e);
        localStorage.removeItem('customerUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoggingIn(true);
    try {
      // Direct API call for customer authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      
      if (result.success && result.user && result.user.role === 'customer') {
        // Store the token if it exists
        if (result.token) {
          localStorage.setItem('customerAuthToken', result.token);
        }
        
        // Fetch customer details through API
        try {
          const customerResponse = await fetch(`/api/customers/${username}`);
          if (customerResponse.ok) {
            const customer = await customerResponse.json();
            const customerUser: CustomerUser = {
              id: customer.id,
              username: customer.username,
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName,
              role: 'customer',
              phone: customer.phone,
              deliveryAddress: customer.deliveryAddress,
              city: customer.city,
              preferredShopId: customer.preferredShopId,
              createdAt: new Date(customer.createdAt),
              updatedAt: new Date(customer.updatedAt)
            };
          
            setUser(customerUser);
            localStorage.setItem('customerUser', JSON.stringify(customerUser));
            
            return { success: true };
          } else {
            // If customer API fails, create minimal user object
            const customerUser: CustomerUser = {
              id: result.user?.id?.toString() || '',
              username: username,
              email: '',
              firstName: '',
              lastName: '',
              role: 'customer',
              phone: '',
              deliveryAddress: '',
              city: '',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            setUser(customerUser);
            localStorage.setItem('customerUser', JSON.stringify(customerUser));
            
            return { success: true };
          }
        } catch (error) {
          console.error('Error fetching customer details:', error);
          // Create minimal user object if API fails
          const customerUser: CustomerUser = {
            id: result.user?.id?.toString() || '',
            username: username,
            email: '',
            firstName: '',
            lastName: '',
            role: 'customer',
            phone: '',
            deliveryAddress: '',
            city: '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          setUser(customerUser);
          localStorage.setItem('customerUser', JSON.stringify(customerUser));
          
          return { success: true };
        }
      } else {
        return { success: false, message: result.message || 'Invalid credentials' };
      }
    } catch (error) {
      return { success: false, message: 'An error occurred during login' };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const register = async (customerData: any) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if user was created successfully
        if (data.userCreated) {
          // Use the actual username returned from registration (might be different)
          const loginUsername = data.username || customerData.username;
          // Auto-login after successful registration
          const loginResult = await login(loginUsername, customerData.password);
          return loginResult;
        } else {
          return { success: false, message: 'User creation failed' };
        }
      } else {
        return { success: false, message: data.error || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, message: 'An error occurred during registration' };
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/customers/${user.username}`);
      if (response.ok) {
        const customer = await response.json();
        const customerUser: CustomerUser = {
          id: customer.id,
          username: customer.username,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          role: 'customer',
          phone: customer.phone,
          deliveryAddress: customer.deliveryAddress,
          city: customer.city,
          preferredShopId: customer.preferredShopId,
          createdAt: new Date(customer.createdAt),
          updatedAt: new Date(customer.updatedAt)
        };
      
        setUser(customerUser);
        localStorage.setItem('customerUser', JSON.stringify(customerUser));
      }
    } catch (error) {
      console.error('Error refreshing user details:', error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('customerUser');
    localStorage.removeItem('customerAuthToken');
    localStorage.removeItem('cartItems'); // Clear cart on logout
    router.push('/ecommerce');
  };

  return (
    <CustomerAuthContext.Provider value={{ user, login, logout, isLoading, isLoggingIn, register, refreshUser }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}