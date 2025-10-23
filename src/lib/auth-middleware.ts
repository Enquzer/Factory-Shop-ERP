import { User } from './auth';

// Helper function to get user from localStorage (client-side only)
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') {
    // Server-side, we can't access localStorage
    return null;
  }
  
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (e) {
      console.error('Failed to parse stored user', e);
      return null;
    }
  }
  return null;
};

// Helper function to check if user is factory
export const isFactoryUser = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'factory';
};

// Helper function to check if user is shop
export const isShopUser = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'shop';
};