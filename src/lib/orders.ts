

'use client';

import { db } from './firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { type Product, type ProductVariant, updateProductStock } from './products';

export type OrderItem = { 
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  variant: ProductVariant;
  quantity: number;
};

export type OrderStatus = 'Pending' | 'Awaiting Payment' | 'Paid' | 'Dispatched' | 'Delivered' | 'Cancelled';

export type Order = {
    id: string;
    shopId: string;
    shopName: string;
    date: string;
    status: OrderStatus;
    amount: number;
    items: OrderItem[];
}

class OrdersManager {
    private orders: Order[] = [];
    private subscribers: ((orders: Order[]) => void)[] = [];

    constructor() {
        this.loadOrders();
    }

    private loadOrders() {
        if (typeof window !== 'undefined') {
            const storedOrders = localStorage.getItem('carement_orders');
            if (storedOrders) {
                try {
                    this.orders = JSON.parse(storedOrders);
                } catch (e) {
                    console.error("Failed to parse orders from localStorage", e);
                    this.orders = [];
                }
            } else {
                 this.populateMockData();
            }
        }
    }
    
    private populateMockData() {
         const mockOrders: Omit<Order, 'id' | 'date' | 'status'>[] = [
            { shopId: 'SHP-001', shopName: 'Bole Boutique', amount: 25000, items: [] },
            { shopId: 'SHP-002', shopName: 'Hawassa Habesha', amount: 15000, items: [] },
            { shopId: 'SHP-001', shopName: 'Bole Boutique', amount: 8000, items: [] },
        ];
        
        const newOrders: Order[] = mockOrders.map((order, index) => ({
             ...order,
            id: `ORD-MOCK-${index}`,
            date: new Date(new Date().setDate(new Date().getDate() - (3-index))).toISOString().split('T')[0],
            status: 'Pending',
        }));

        newOrders[0].status = 'Awaiting Payment';
        newOrders[1].status = 'Paid';
        newOrders[2].status = 'Dispatched';
        this.orders = newOrders;
        this.saveOrders();
    }

    private saveOrders() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('carement_orders', JSON.stringify(this.orders));
            this.notifySubscribers();
        }
    }

    private notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.orders));
    }

    subscribe(callback: (orders: Order[]) => void) {
        this.subscribers.push(callback);
        // Immediately notify with current data
        callback(this.orders); 
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    get allOrders() {
        return [...this.orders];
    }
    
    async addOrder(order: Omit<Order, 'id' | 'date' | 'status'>): Promise<Order> {
        const newOrder: Order = {
            ...order,
            id: `ORD-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
            date: new Date().toISOString().split('T')[0],
            status: 'Pending',
        };

        // Deduct stock
        try {
            await runTransaction(db, async (transaction) => {
                for (const item of newOrder.items) {
                    await updateProductStock(transaction, item.productId, item.variant.id, -item.quantity);
                }
            });
        } catch (error) {
            console.error("Stock update transaction failed: ", error);
            throw new Error("Failed to update stock. Order not placed.");
        }


        this.orders = [newOrder, ...this.orders];
        this.saveOrders();
        return newOrder;
    }

    updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        const orderIndex = this.orders.findIndex(order => order.id === orderId);
        if (orderIndex > -1) {
            this.orders[orderIndex].status = newStatus;
            this.saveOrders();
        }
    }
}

export const ordersStore = new OrdersManager();
