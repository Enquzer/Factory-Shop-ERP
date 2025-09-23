
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

// Standalone function to get all orders, suitable for server-side use.
export async function getOrders(): Promise<Order[]> {
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(ordersQuery);
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: (data.createdAt as Timestamp).toDate().toISOString().split('T')[0],
        } as Order;
    });
}

// Standalone function to get all orders for a specific shop.
export async function getOrdersForShop(shopId: string): Promise<Order[]> {
    const ordersQuery = query(
        collection(db, "orders"), 
        where("shopId", "==", shopId),
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(ordersQuery);
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: (data.createdAt as Timestamp).toDate().toISOString().split('T')[0],
        } as Order;
    });
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
                console.log("No orders found in Firestore.");
                // We won't populate mock data here anymore to avoid conflicts with server-side rendering
                this.orders = [];
            } else {
                this.orders = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        date: (data.createdAt as Timestamp).toDate().toISOString().split('T')[0],
                    } as Order;
                });
            }
            this.notifySubscribers();
        }, (error) => {
            console.error("Error listening to orders collection:", error);
        });
    }

    private notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.orders));
    }

    subscribe(callback: (orders: Order[]) => void): () => void {
        this.subscribers.push(callback);
        callback(this.orders); 
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    get allOrders() {
        return [...this.orders];
    }
    
    async addOrder(order: Omit<Order, 'id' | 'date' | 'status' | 'createdAt'>): Promise<Order> {
        try {
            await runTransaction(db, async (transaction) => {
                for (const item of order.items) {
                    await updateProductStock(transaction, item.productId, item.variant.id, -item.quantity);
                }
            });

            const docRef = await addDoc(collection(db, 'orders'), {
                ...order,
                status: 'Pending' as OrderStatus,
                createdAt: serverTimestamp(),
            });
            
             return {
                ...order,
                id: docRef.id,
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
        } catch (error) {
            console.error(`Failed to update status for order ${orderId}:`, error);
        }
    }
}

export const ordersStore = new OrdersManager();
