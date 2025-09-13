"use client";

import { type Product, type ProductVariant } from "@/app/shop/(app)/products/page";
import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";

export type OrderItem = Omit<Product, 'variants'> & { 
  variant: ProductVariant;
  quantity: number;
};

export type Order = {
    id: string;
    date: string;
    status: string;
    statusVariant: "default" | "secondary" | "destructive" | "outline";
    amount: number;
    items: OrderItem[];
}

interface OrderContextType {
  items: OrderItem[];
  orders: Order[];
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearOrder: () => void;
  placeOrder: () => void;
  totalAmount: number;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const router = useRouter();

  const addItem = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.variant.id === variant.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const { variants, ...productData } = product;
      return [...prevItems, { ...productData, variant, quantity }];
    });
  };

  const removeItem = (variantId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) {
        removeItem(variantId);
        return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.variant.id === variantId ? { ...item, quantity: quantity } : item
      )
    );
  };

  const clearOrder = () => {
    setItems([]);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);

  const placeOrder = () => {
      if (items.length === 0) return;

      const newOrder: Order = {
          id: `ORD-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
          date: new Date().toISOString().split('T')[0],
          status: 'Pending',
          statusVariant: 'default',
          amount: totalAmount,
          items: [...items],
      };

      setOrders(prevOrders => [newOrder, ...prevOrders]);
      clearOrder();
      router.push('/shop/orders');
  }

  const value = {
    items,
    orders,
    addItem,
    removeItem,
    updateQuantity,
    clearOrder,
    placeOrder,
    totalAmount,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
}
