

"use client";

import { type Product, type ProductVariant } from "@/lib/products";
import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ordersStore, type Order } from "@/lib/orders";
import { useSnapshot } from "valtio";
import { useToast } from "./use-toast";
import { createNotification } from "@/lib/notifications";
// import jsPDF from "jspdf";
// import autoTable from 'jspdf-autotable';

export type OrderItem = { 
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  variant: ProductVariant;
  quantity: number;
};

interface OrderContextType {
  items: OrderItem[];
  orders: Order[];
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearOrder: () => void;
  placeOrder: () => void;
  totalAmount: number;
  shopDiscount: number;
  shopId: string; // Mock shop ID
  shopName: string; // Mock shop Name
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);


const generateInvoicePDF = (order: Order) => {
    // const doc = new jsPDF();

    // doc.text(`Invoice for Order #${order.id}`, 14, 20);
    // doc.setFontSize(12);
    // doc.text(`Shop: ${order.shopName}`, 14, 30);
    // doc.text(`Date: ${order.date}`, 14, 36);

    // autoTable(doc, {
    //     startY: 45,
    //     head: [['Product', 'Variant', 'Qty', 'Unit Price', 'Total']],
    //     body: order.items.map(item => [
    //         item.name,
    //         `${item.variant.color}, ${item.variant.size}`,
    //         item.quantity,
    //         `ETB ${item.price.toFixed(2)}`,
    //         `ETB ${(item.price * item.quantity).toFixed(2)}`
    //     ]),
    // });

    // const finalY = (doc as any).lastAutoTable.finalY;
    // doc.setFontSize(14);
    // doc.text(`Total Amount: ETB ${order.amount.toFixed(2)}`, 14, finalY + 15);

    // doc.save(`invoice-${order.id}.pdf`);
}


export function OrderProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  // Mocking shop-specific data. In a real app, this would come from auth context.
  const shopId = "SHP-001";
  const shopName = "Bole Boutique";
  const shopDiscount = 0.05;

  const orderState = useSnapshot(ordersStore);
  const orders = orderState.allOrders.filter(o => o.shopId === shopId);


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
          imageUrl: variant.imageUrl, 
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
  
  const finalAmountAfterDiscount = totalAmount * (1 - shopDiscount);

  const placeOrder = () => {
      if (items.length === 0) return;

      const newOrder = ordersStore.addOrder({
          shopId,
          shopName,
          amount: finalAmountAfterDiscount,
          items: [...items],
      });
      
      clearOrder();

       toast({
          title: "Order Placed Successfully!",
          description: `Your order #${newOrder.id} has been sent for processing.`,
          action: (
              <button
                onClick={() => generateInvoicePDF(newOrder)}
                className="bg-primary text-primary-foreground py-1 px-3 rounded-md text-sm"
                disabled
              >
                Download Invoice
              </button>
          )
      });
      
      // Create notification for factory
      createNotification({
          userType: 'factory',
          title: `New Order: ${newOrder.id}`,
          description: `From ${shopName} for ETB ${newOrder.amount.toFixed(2)}`,
          href: `/orders`
      });

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
    shopDiscount,
    shopId,
    shopName,
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
