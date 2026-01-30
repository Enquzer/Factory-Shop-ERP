"use client";

import { useState, useEffect } from 'react';
import { CartItem, addCartItem, getCartItems, updateCartItemQuantity, removeCartItem, clearCart } from '@/lib/customers-sqlite';
import { useCustomerAuth } from '@/contexts/customer-auth-context';

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
  const { user } = useCustomerAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  const fetchCartItems = async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const cartItems = await getCartItems(user.id);
      setItems(cartItems);
    } catch (err) {
      console.error('Error fetching cart items:', err);
      setError('Failed to load cart items');
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, 'id' | 'customerId' | 'createdAt'>) => {
    if (!user) {
      setError('You must be logged in to add items to cart');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await addCartItem(user.id, item);
      await fetchCartItems(); // Refresh cart
    } catch (err) {
      console.error('Error adding item to cart:', err);
      setError('Failed to add item to cart');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!user) {
      setError('You must be logged in to update cart items');
      return;
    }

    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await updateCartItemQuantity(itemId, quantity);
      await fetchCartItems(); // Refresh cart
    } catch (err) {
      console.error('Error updating cart item quantity:', err);
      setError('Failed to update item quantity');
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user) {
      setError('You must be logged in to remove items from cart');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await removeCartItem(itemId);
      await fetchCartItems(); // Refresh cart
    } catch (err) {
      console.error('Error removing item from cart:', err);
      setError('Failed to remove item from cart');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCartItems = async () => {
    if (!user) {
      setError('You must be logged in to clear cart');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await clearCart(user.id);
      setItems([]);
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError('Failed to clear cart');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, [user?.id]);

  return {
    items,
    itemCount,
    totalPrice,
    isLoading,
    error,
    addItem,
    updateQuantity,
    removeItem,
    clearCart: clearCartItems,
    refreshCart: fetchCartItems
  };
}