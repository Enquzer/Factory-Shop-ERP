

'use client';

import { db } from './firebase';
import { doc, runTransaction, collection, query, where, onSnapshot, getDocs, writeBatch, serverTimestamp, addDoc, orderBy, Timestamp } from 'firebase/firestore';
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
    createdAt: Timestamp;
}

class OrdersManager {
    private orders: Order[] = [];
    private subscribers: ((orders: Order[]) => void)[] = [];
    private unsubscribeFromFirestore: (() => void) | null = null;

    constructor() {
        this.listenForOrders();
    }

    private listenForOrders() {
        if (this.unsubscribeFromFirestore) {
            this.unsubscribeFromFirestore();
        }

        const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        
        this.unsubscribeFromFirestore = onSnapshot(ordersQuery, async (snapshot) => {
            if (snapshot.empty) {
                console.log("No orders found in Firestore. Populating with mock data.");
                await this.populateMockData();
                return;
            }
            
            this.orders = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Firebase timestamps need to be converted
                    date: (data.createdAt as Timestamp).toDate().toISOString().split('T')[0],
                } as Order;
            });
            this.notifySubscribers();
        }, (error) => {
            console.error("Error listening to orders collection:", error);
        });
    }
    
    private async populateMockData() {
         const mockOrdersData = [
            { shopId: 'SHP-001', shopName: 'Bole Boutique', amount: 25000, items: [], status: 'Awaiting Payment' },
            { shopId: 'SHP-002', shopName: 'Hawassa Habesha', amount: 15000, items: [], status: 'Paid' },
            { shopId: 'SHP-001', shopName: 'Bole Boutique', amount: 8000, items: [], status: 'Dispatched' },
        ];
        
        const batch = writeBatch(db);
        mockOrdersData.forEach((order, index) => {
            const orderRef = doc(collection(db, 'orders'));
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - (3 - index));
            batch.set(orderRef, {
                ...order,
                createdAt: Timestamp.fromDate(orderDate),
            });
        });
        
        await batch.commit();
        // The listener will pick up the new data automatically
    }

    private notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.orders));
    }

    subscribe(callback: (orders: Order[]) => void): () => void {
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
    
    async addOrder(order: Omit<Order, 'id' | 'date' | 'status' | 'createdAt'>): Promise<Order> {
        // Deduct stock
        try {
            await runTransaction(db, async (transaction) => {
                for (const item of order.items) {
                    await updateProductStock(transaction, item.productId, item.variant.id, -item.quantity);
                }
            });

            // If stock deduction is successful, create the order
            const orderRef = doc(collection(db, 'orders'));
            const newOrderData = {
                ...order,
                status: 'Pending' as OrderStatus,
                createdAt: serverTimestamp(),
            };
            await addDoc(collection(db, 'orders'), newOrderData);
            
            // The listener will automatically update the local state.
            // We can construct a temporary object to return, but the ID will be wrong.
            // Best to rely on the listener to update UI.
             return {
                ...order,
                id: 'TEMP-' + Date.now(), // temporary ID
                status: 'Pending',
                date: new Date().toISOString().split('T')[0],
                createdAt: Timestamp.now(),
            };

        } catch (error) {
            console.error("Order placement transaction failed: ", error);
            throw new Error("Failed to update stock. Order not placed.");
        }
    }

    async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        const orderRef = doc(db, "orders", orderId);
        try {
            await runTransaction(db, async (transaction) => {
                transaction.update(orderRef, { status: newStatus });
            });
            // Listener will update local state
        } catch (error) {
            console.error(`Failed to update status for order ${orderId}:`, error);
        }
    }
}

export const ordersStore = new OrdersManager();

