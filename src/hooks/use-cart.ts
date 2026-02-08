import { useState, useEffect, useCallback } from 'react';
import { useCustomerAuth } from '@/contexts/customer-auth-context';
import { useCartContext } from '@/contexts/cart-context';

// Export the CartItem type from here as well to avoid duplication
export type CartItem = {
  id: string;
  customerId: string;
  productId: string;
  productVariantId: string;
  name: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
  imageUrl?: string;
  createdAt: string | Date;
};

type CartHook = {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  isLoading: boolean;
  error: string | null;
  addItem: (item: Omit<CartItem, 'id' | 'customerId' | 'createdAt'>) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

export function useCart(): CartHook {
  const { state, dispatch } = useCartContext();
  const { user } = useCustomerAuth(); // This will only be available in ecommerce contexts

  const itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);

  const fetchCartItems = useCallback(async () => {
    if (!user) {
      dispatch({ type: 'SET_ITEMS', payload: [] });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch('/api/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart items');
      }
      
      const data = await response.json();
      dispatch({ type: 'SET_ITEMS', payload: data.items || [] });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart items' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, dispatch]);

  const addItem = async (item: Omit<CartItem, 'id' | 'customerId' | 'createdAt'>) => {
    if (!user) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to add items to cart' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add item to cart');
      }
      
      await fetchCartItems(); // Refresh cart
    } catch (err) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: err instanceof Error ? err.message : 'Failed to add item to cart' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!user) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to update cart items' });
      return;
    }

    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }
      
      await fetchCartItems(); // Refresh cart
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update item quantity' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to remove items from cart' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove item');
      }
      
      await fetchCartItems(); // Refresh cart
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove item from cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearCartItems = async () => {
    if (!user) {
      dispatch({ type: 'SET_ERROR', payload: 'You must be logged in to clear cart' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch('/api/cart/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }
      
      dispatch({ type: 'CLEAR_CART' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear cart' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Handle user logout by clearing cart
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [user, dispatch]);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  return {
    items: state.items,
    itemCount,
    totalPrice,
    isLoading: state.isLoading,
    error: state.error,
    addItem,
    updateQuantity,
    removeItem,
    clearCart: clearCartItems,
    refreshCart: fetchCartItems
  };
}