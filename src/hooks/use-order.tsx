'use client';

import { type Product, type ProductVariant } from "@/lib/products";
import { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { type Order } from "@/lib/orders";
import { useToast } from "./use-toast";
import { createNotification } from "@/lib/notifications";
import { getShopById, getShopByUsername, type Shop } from "@/lib/shops";
import { useAuth } from '@/contexts/auth-context';
import { type ShopInventoryItem } from "@/lib/shop-inventory-sqlite";
import { getProducts } from "@/lib/products";
import { recordVariantDemand } from "@/lib/variant-demand";

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
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => Promise<void>;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  clearOrder: () => void;
  placeOrder: () => void;
  totalAmount: number;
  shopDiscount: number;
  shopId: string;
  shopName: string;
  // Add shop inventory to the context
  shopInventory: ShopInventoryItem[];
  getAvailableStock: (variantId: string) => number;
  // Add refresh function
  refreshOrders: () => Promise<void>;
  addSimplifiedOrder: (productCode: string, distribution: Map<string, number>) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Default context values for when OrderProvider is not available
const defaultOrderContext: OrderContextType = {
  items: [],
  orders: [],
  isLoading: false,
  addItem: async () => {},
  removeItem: () => {},
  updateQuantity: async () => {},
  clearOrder: () => {},
  placeOrder: () => {},
  totalAmount: 0,
  shopDiscount: 0,
  shopId: "",
  shopName: "",
  shopInventory: [],
  getAvailableStock: () => 0,
  refreshOrders: async () => {},
  addSimplifiedOrder: async () => {},
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Add state for shop inventory
  const [shopInventory, setShopInventory] = useState<ShopInventoryItem[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const isRefreshing = useRef(false); // Ref to track refresh state

  // Get the shop ID from the authenticated user
  const shopId = useMemo(() => {
    if (user && user.role === 'shop') {
      // We'll need to get the actual shop ID from the shops table based on the username
      return null; // Will be set in useEffect
    }
    return null;
  }, [user]);

  useEffect(() => {
    const fetchShopData = async () => {
      if (!user || user.role !== 'shop') {
        setIsLoading(false);
        return;
      }
      
      try {
        // Get shop data through API instead of direct database call
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const shopData = await response.json();
          if (shopData) {
            setShop(shopData);
            if (shopData.status === 'Inactive') {
              toast({
                  title: "Account Deactivated",
                  description: "Your shop account is currently inactive. Please contact the factory for support.",
                  variant: "destructive",
                  duration: Infinity,
              });
              router.push('/shop/login');
            }
          } else {
            toast({
                title: "Shop Not Found",
                description: "Your shop account could not be found. Please contact the factory for support.",
                variant: "destructive",
                duration: Infinity,
            });
            router.push('/shop/login');
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch shop data');
        }
      } catch (error) {
        console.error("Error fetching shop data:", error);
        toast({
            title: "Error",
            description: "Failed to load shop information.",
            variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchShopData();
  }, [user?.username, user?.role]); // Add proper dependencies

  // Fetch shop inventory when shop data is available
  useEffect(() => {
    const fetchShopInventory = async () => {
      if (!shop || !user) return;
      
      try {
        const response = await fetch(`/api/shop-inventory?username=${user.username}`);
        if (response.ok) {
          const inventory = await response.json();
          setShopInventory(inventory);
        }
      } catch (error) {
        console.error("Error fetching shop inventory:", error);
      }
    };
    
    fetchShopInventory();
  }, [shop?.id, user?.username]); // Add proper dependencies

  useEffect(() => {
    // Only fetch orders if we have a valid shop
    if (!shop) return;
    
    // Fetch orders from API instead of using ordersStore directly
    const fetchOrders = async () => {
      if (isRefreshing.current) return;
      
      isRefreshing.current = true;
      setIsLoading(true);
      
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/orders?shopId=${shop.id}`, {
          headers: token ? headers : undefined
        });
        if (response.ok) {
          const shopOrders = await response.json();
          setOrders(shopOrders);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        isRefreshing.current = false;
        setIsLoading(false);
      }
    };
    
    fetchOrders();
    
    // Set up polling to refresh orders periodically
    const intervalId = setInterval(fetchOrders, 30000); // Every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [shop?.id]); // Make sure dependencies are correct

  // Add function to get available stock for a variant
  const getAvailableStock = (variantId: string) => {
    const inventoryItem = shopInventory.find(item => item.productVariantId === variantId);
    return inventoryItem ? inventoryItem.stock : 0;
  };

  // Add function to check if factory has stock for a variant
  const checkFactoryStock = async (variantId: string) => {
    try {
      const response = await fetch(`/api/factory-stock?variantId=${variantId}`);
      if (response.ok) {
        const data = await response.json();
        return data.factoryStock > 0;
      } else if (response.status === 404) {
        // Variant not found in factory stock
        return false;
      }
      // For other errors, we'll just return false
      return false;
    } catch (error) {
      console.error(`Error checking factory stock for variant ${variantId}:`, error);
      return false;
    }
  };
  
  // Add function to get exact factory stock quantity
  const getFactoryStock = async (variantId: string): Promise<number> => {
    try {
      const response = await fetch(`/api/factory-stock?variantId=${variantId}`);
      if (response.ok) {
        const data = await response.json();
        return data.factoryStock;
      } else if (response.status === 404) {
        // Variant not found in factory stock
        return 0;
      }
      // For other errors, we'll just return 0
      return 0;
    } catch (error) {
      console.error(`Error checking factory stock for variant ${variantId}:`, error);
      return 0;
    }
  };

  const addItem = async (product: Product, variant: ProductVariant, quantity: number = 1) => {
    // Check factory stock before adding item to cart
    const factoryStock = await getFactoryStock(variant.id);
    if (factoryStock < quantity) {
      toast({
        title: "Insufficient Factory Stock",
        description: `Not enough stock for ${product.name} (${variant.color}, ${variant.size}). Available: ${factoryStock}, Requested: ${quantity}`,
        variant: "destructive",
      });
      return;
    }
    
    // Add item to cart
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.variant.id === variant.id);
      if (existingItem) {
        // Check if the new total quantity would exceed factory stock
        const newTotalQuantity = existingItem.quantity + quantity;
        if (factoryStock < newTotalQuantity) {
          toast({
            title: "Insufficient Factory Stock",
            description: `Not enough stock for ${product.name} (${variant.color}, ${variant.size}). Available: ${factoryStock}, Requested: ${newTotalQuantity}`,
            variant: "destructive",
          });
          return prevItems; // Don't update items
        }
        
        return prevItems.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: newTotalQuantity }
            : item
        );
      }
      return [...prevItems, { 
          productId: product.id,
          name: product.name,
          price: product.price,
          productCode: product.productCode,
          imageUrl: variant.imageUrl || product.imageUrl || "",
          variant, 
          quantity 
      }];
    });
  
    if (factoryStock >= quantity) {
      toast({
        title: "Item Added",
        description: `${product.name} added to your order. (Factory stock: ${factoryStock})`,
      });
    }
  };

  const removeItem = (variantId: string) => {
    const itemToRemove = items.find((item) => item.variant.id === variantId);
    if (itemToRemove) {
      toast({
      title: "Item Removed",
      description: `${itemToRemove.name} removed from your order.`,
    });
  }
  setItems((prevItems) => prevItems.filter((item) => item.variant.id !== variantId));
};

  const updateQuantity = async (variantId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(variantId);
      return;
    }
    
    // Find the item to get its variant ID for stock check
    const item = items.find((item) => item.variant.id === variantId);
    if (!item) return;
    
    // Check factory stock before updating quantity
    const factoryStock = await getFactoryStock(variantId);
    if (factoryStock < quantity) {
      toast({
        title: "Insufficient Factory Stock",
        description: `Not enough stock for ${item.name} (${item.variant.color}, ${item.variant.size}). Available: ${factoryStock}, Requested: ${quantity}`,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Quantity Updated",
      description: `Quantity for ${item.name} updated to ${quantity}. (Factory stock: ${factoryStock})`,
    });
    
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.variant.id === variantId ? { ...item, quantity: quantity } : item
      )
    );
    return;
  };

  const clearOrder = () => {
    if (items.length > 0) {
      toast({
          title: "Order Cleared",
          description: "Your order has been cleared.",
      });
    }
    setItems([]);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [items]);
  
  const shopDiscount = shop?.discount || 0;
  const shopName = shop?.name || "";
  const finalAmountAfterDiscount = totalAmount * (1 - shopDiscount);

  // Add refreshOrders function
  const refreshOrders = useCallback(async () => {
    if (!shop || isRefreshing.current) return;
    
    // Prevent multiple simultaneous refreshes
    isRefreshing.current = true;
    setIsLoading(true);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
            
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
            
      const response = await fetch(`/api/orders?shopId=${shop.id}`, {
        headers: token ? headers : undefined
      });
      if (response.ok) {
        const shopOrders = await response.json();
        setOrders(shopOrders);
      }
    } catch (error) {
      console.error("Error refreshing orders:", error);
    } finally {
      isRefreshing.current = false;
      setIsLoading(false);
    }
  }, [shop?.id]);

  const placeOrder = async () => {
      if (items.length === 0 || !shop) {
        toast({
            title: "Cannot Place Order",
            description: "Your order is empty or shop information is missing.",
            variant: "destructive",
        });
        return;
      }

      try {
        // Show loading toast
        const loadingToast = toast({
            title: "Placing Order",
            description: "Please wait while we process your order...",
        });

        console.log('Placing order for shop:', { shopId: shop.id, shopName: shop.name });
        console.log('Order items:', items);
        console.log('Total amount:', finalAmountAfterDiscount);

        // Use API call instead of ordersStore
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: token ? headers : undefined,
          body: JSON.stringify({
            shopId: shop.id,
            shopName: shop.name,
            amount: finalAmountAfterDiscount,
            items: [...items],
          }),
        });

        if (!response.ok) {
          let errorMessage = `Failed to place order: ${response.status} ${response.statusText}`;
          try {
            // Try to parse the error response as JSON to get the specific error message
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use the text response
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          console.error('Order API error response:', errorMessage);
          throw new Error(errorMessage);
        }

        const newOrder = await response.json();
        console.log('Order placed successfully:', newOrder);
        
        // Record variant demand for each item in the order
        for (const item of items) {
          try {
            await recordVariantDemand(item.variant.id, item.productId, shop.id, item.quantity);
          } catch (error) {
            console.error('Error recording variant demand for item:', item, error);
          }
        }
        
        // Update the local orders state to include the new order
        setOrders(prevOrders => [...prevOrders, newOrder]);
        
        clearOrder();

        toast({
            title: "Order Placed Successfully!",
            description: `Your order #${newOrder.id} has been sent for processing.`,
        });

        // Refresh orders to ensure the new order appears in the history
        if (refreshOrders) {
            await refreshOrders();
        }

        // Create notification for factory
        try {
          const notificationResponse = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userType: 'factory',
              title: `New Order: ${newOrder.id}`,
              description: `From ${shop.name} for ETB ${newOrder.amount.toFixed(2)}`,
              href: `/orders`
            }),
          });
          
          if (!notificationResponse.ok) {
            throw new Error('Failed to create notification');
          }
          
          console.log('Factory notification sent for order:', newOrder.id);
        } catch (notificationError) {
          console.error('Failed to send factory notification:', notificationError);
          toast({
              title: "Notification Warning",
              description: "Order was placed but notification to factory may have failed.",
              variant: "destructive",
          });
        }

        router.push('/shop/orders');
      } catch (error: any) {
         console.error("Failed to place order:", error);
         toast({
            title: "Order Failed",
            description: error.message || "There was an issue placing your order. Please check your order quantities against available factory stock.",
            variant: "destructive",
         });
      }
  }

  const addSimplifiedOrder = async (productCode: string, distribution: Map<string, number>) => {
    try {
      // Get the full product with variants
      const products = await getProducts();
      const product = products.find(p => p.productCode === productCode);
      
      if (!product) {
        toast({
          title: "Product Not Found",
          description: `Product ${productCode} could not be found.`,
          variant: "destructive",
        });
        return;
      }
      
      // Convert distribution map to order items
      const orderItems: OrderItem[] = [];
      let totalQuantity = 0;
      
      for (const [variantId, quantity] of distribution) {
        if (quantity <= 0) continue;
        
        const variant = product.variants.find(v => v.id === variantId);
        if (!variant) continue;
        
        // Check factory stock for this variant
        const factoryStock = await getFactoryStock(variantId);
        if (factoryStock < quantity) {
          toast({
            title: "Insufficient Factory Stock",
            description: `Not enough stock for ${product.name} (${variant.color}, ${variant.size}). Available: ${factoryStock}, Requested: ${quantity}`,
            variant: "destructive",
          });
          return;
        }
        
        orderItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || "",
          productCode: product.productCode,
          variant: variant,
          quantity: quantity
        });
        
        totalQuantity += quantity;
      }
      
      if (orderItems.length === 0) {
        toast({
          title: "No Items to Order",
          description: "No valid items to add to your order.",
          variant: "destructive",
        });
        return;
      }
      
      // Add items to the order
      setItems(prevItems => {
        const newItems = [...prevItems];
        
        for (const newItem of orderItems) {
          const existingItemIndex = newItems.findIndex(
            item => item.variant.id === newItem.variant.id
          );
          
          if (existingItemIndex >= 0) {
            // Update existing item quantity
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + newItem.quantity
            };
          } else {
            // Add new item
            newItems.push(newItem);
          }
        }
        
        return newItems;
      });
      
      toast({
        title: "Order Updated",
        description: `Added ${totalQuantity} units of ${product.name} to your order.`,
      });
    } catch (error) {
      console.error("Error adding simplified order:", error);
      toast({
        title: "Order Failed",
        description: "There was an issue adding items to your order. Please try again.",
        variant: "destructive",
      });
    }
  };

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
    shopId: shop?.id || "",
    shopName: shop?.name || "",
    // Include shop inventory in the context value
    shopInventory,
    getAvailableStock,
    // Add refresh function
    refreshOrders,
    // Add simplified order function
    addSimplifiedOrder
  };

  // Always provide the context, even for non-shop users
  // This prevents the "useOrder must be used within an OrderProvider" error
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const context = useContext(OrderContext);
  // Return a default context instead of throwing an error
  // This allows the component to work in both factory and shop contexts
  return context || defaultOrderContext;
}