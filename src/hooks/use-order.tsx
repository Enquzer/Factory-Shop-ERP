

'use client';

import { type Product, type ProductVariant } from "@/lib/products";
import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ordersStore, type Order } from "@/lib/orders";
import { useToast } from "./use-toast";
import { createNotification } from "@/lib/notifications";
import { getShopById, type Shop } from "@/lib/shops";

export type OrderItem = { 
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  productCode: string;
  variant: ProductVariant;
  quantity: number;
};

interface OrderContextType {
  items: OrderItem[];
  orders: Order[];
  isLoading: boolean;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearOrder: () => void;
  placeOrder: () => void;
  totalAmount: number;
  shopDiscount: number;
  shopId: string;
  shopName: string;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);


export function OrderProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Mocking shop-specific data. In a real app, this would come from auth context.
  const shopId = "SHP-001";
  
  useEffect(() => {
    const fetchShopData = async () => {
        const shopData = await getShopById(shopId);
        setShop(shopData);
        if (shopData?.status === 'Inactive') {
            toast({
                title: "Account Deactivated",
                description: "Your shop account is currently inactive. Please contact the factory for support.",
                variant: "destructive",
                duration: Infinity,
            });
            router.push('/shop/login');
        }
    }
    fetchShopData();
  }, [shopId, router, toast])

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = ordersStore.subscribe(allOrders => {
      const shopOrders = allOrders.filter(o => o.shopId === shopId);
      setOrders(shopOrders);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [shopId]);


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
      return [...prevItems, { 
          productId: product.id,
          name: product.name,
          price: product.price,
          productCode: product.productCode,
          imageUrl: variant.imageUrl || product.imageUrl, 
          variant, 
          quantity 
      }];
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
  
  const shopDiscount = shop?.discount || 0;
  const shopName = shop?.name || "";
  const finalAmountAfterDiscount = totalAmount * (1 - shopDiscount);

  const placeOrder = async () => {
      if (items.length === 0 || !shop) return;

      try {
        const newOrder = await ordersStore.addOrder({
            shopId,
            shopName,
            amount: finalAmountAfterDiscount,
            items: [...items],
        });
        
        clearOrder();

        toast({
            title: "Order Placed Successfully!",
            description: `Your order #${newOrder.id} has been sent for processing.`,
        });

        // Create notification for factory
        createNotification({
            userType: 'factory',
            title: `New Order: ${newOrder.id}`,
            description: `From ${shopName} for ETB ${newOrder.amount.toFixed(2)}`,
            href: `/orders`
        });

        router.push('/shop/orders');
      } catch (error) {
         console.error("Failed to place order:", error);
         toast({
            title: "Order Failed",
            description: "There was an issue placing your order. It might be due to insufficient stock. Please try again.",
            variant: "destructive",
         });
      }
  }

  const value = {
    items,
    orders,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearOrder,
    placeOrder,
    totalAmount,
    shopDiscount,
    shopId,
    shopName,
  };

  if (shop?.status === 'Inactive') {
    return null; // Don't render the app for inactive shops
  }

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
}
