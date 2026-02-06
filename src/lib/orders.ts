import { getDb, resetDbCache } from './db';
import { updateVariantStock } from './products';

export type OrderItem = { 
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  variant: {
    id: string;
    color: string;
    size: string;
    stock: number;
    imageUrl?: string;
  };
  quantity: number;
};

export type OrderStatus = 'Pending' | 'Awaiting Payment' | 'Payment Slip Attached' | 'Paid' | 'Released' | 'Dispatched' | 'Delivered' | 'Cancelled';

export type Order = {
    id: string;
    shopId: string;
    shopName: string;
    date: string;
    status: OrderStatus;
    amount: number;
    items: OrderItem[];
    createdAt: Date;
    // Additional fields for enhanced workflow
    paymentSlipUrl?: string;
    dispatchInfo?: {
        shopName: string; // Changed from accountId to shopName
        transportLicensePlate: string;
        contactPerson: string;
        dispatchDate: string;
        driverName?: string; // Added driver name field
        attachments?: string[]; // Added attachments field
        padNumber?: string; // Added PAD number
        receiptNumber?: string; // Added Receipt number
        comment?: string; // Added comment field
    };
    deliveryDate?: string;
    isClosed?: boolean;
    feedback?: string;
    // Delivery performance tracking fields
    requestedDeliveryDate?: string; // Shop's requested delivery date
    expectedReceiptDate?: string;   // Shop's expected receipt date
    actualDispatchDate?: string;    // Factory's actual dispatch date
    confirmationDate?: string;      // Shop's confirmation date
    paymentRequested?: boolean;     // Whether finance has requested payment
    // Pad number fields
    padNumber?: string;
    padSequence?: number;
    padPrefix?: string;
    padFormat?: string;
}

// Client-side function to fetch orders from API
export async function getOrders(): Promise<Order[]> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/orders`
      : '/api/orders';
      
    // Get auth token from localStorage for client-side requests
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      headers: token ? headers : undefined
    });
    
    if (!response.ok) {
      // If unauthorized, redirect to login
      if (response.status === 401 && typeof window !== 'undefined') {
        window.location.href = '/login';
        return [];
      }
      throw new Error('Failed to fetch orders');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

// Client-side function to get a single order
export async function getOrder(id: string): Promise<Order | null> {
  try {
    const url = `/api/orders/${id}`;
      
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      headers: token ? headers : undefined
    });
    
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch order');
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    return null;
  }
}

// Server-side function to get all orders from database
export async function getOrdersFromDB(): Promise<Order[]> {
    try {
        const db = await getDb();
        const orders = await db.all(`
          SELECT * FROM orders
          ORDER BY created_at DESC
        `);
        
        return orders.map((order: any) => ({
            id: order.id,
            shopId: order.shopId,
            shopName: order.shopName,
            date: order.date,
            status: order.status,
            amount: order.amount,
            items: JSON.parse(order.items),
            paymentSlipUrl: order.paymentSlipUrl,
            dispatchInfo: order.dispatchInfo ? JSON.parse(order.dispatchInfo) : undefined,
            deliveryDate: order.deliveryDate,
            isClosed: order.isClosed === 1,
            feedback: order.feedback,
            requestedDeliveryDate: order.requestedDeliveryDate,
            expectedReceiptDate: order.expectedReceiptDate,
            actualDispatchDate: order.actualDispatchDate,
            confirmationDate: order.confirmationDate,
            paymentRequested: order.paymentRequested === 1,
            createdAt: new Date(order.created_at)
        }));
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

// Standalone function to get all orders for a specific shop.
export async function getOrdersForShop(shopId: string): Promise<Order[]> {
    try {
        const db = await getDb();
        const orders = await db.all(`
          SELECT * FROM orders 
          WHERE shopId = ?
          ORDER BY created_at DESC
        `, [shopId]);
        
        return orders.map((order: any) => ({
            id: order.id,
            shopId: order.shopId,
            shopName: order.shopName,
            date: order.date,
            status: order.status,
            amount: order.amount,
            items: JSON.parse(order.items),
            paymentSlipUrl: order.paymentSlipUrl,
            dispatchInfo: order.dispatchInfo ? JSON.parse(order.dispatchInfo) : undefined,
            deliveryDate: order.deliveryDate,
            isClosed: order.isClosed === 1,
            feedback: order.feedback,
            requestedDeliveryDate: order.requestedDeliveryDate,
            expectedReceiptDate: order.expectedReceiptDate,
            actualDispatchDate: order.actualDispatchDate,
            confirmationDate: order.confirmationDate,
            createdAt: new Date(order.created_at)
        }));
    } catch (error) {
        console.error('Error fetching orders for shop:', error);
        return [];
    }
}

class OrdersManager {
    private orders: Order[] = [];
    private subscribers: ((orders: Order[]) => void)[] = [];

    constructor() {
        // Only initialize on the server side
        if (typeof window === 'undefined') {
            this.loadOrders();
        }
    }

    private async loadOrders() {
        this.orders = await getOrdersFromDB();
        this.notifySubscribers();
    }

    private notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.orders));
    }

    subscribe(callback: (orders: Order[]) => void): () => void {
        this.subscribers.push(callback);
        // Only send initial data if we're on the server
        if (typeof window === 'undefined') {
            callback(this.orders); 
        }
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    get allOrders() {
        return [...this.orders];
    }
    
    async addOrder(order: Omit<Order, 'id' | 'date' | 'status' | 'createdAt'>): Promise<Order> {
        // Only allow database operations on the server side
        if (typeof window !== 'undefined') {
            throw new Error('Database operations are only available on the server side');
        }
        
        try {
            const db = await getDb();
            
            // Generate descriptive order ID
            // Format: ShopName_MonthDate_OrderSeq#
            const now = new Date();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthDate = `${monthNames[now.getMonth()]}${now.getDate()}`;
            const shopNameClean = order.shopName.replace(/[^a-zA-Z0-9]/g, '');
            
            // Get sequence number for this shop
            const sequenceResult = await db.get('SELECT COUNT(*) as count FROM orders WHERE shopId = ?', [order.shopId]);
            const nextSequence = (sequenceResult?.count || 0) + 1;
            
            const orderId = `${shopNameClean}_${monthDate}_Order${nextSequence}`;
            
            // Insert order into database
            const orderData = {
                ...order,
                id: orderId,
                status: 'Pending' as OrderStatus,
                date: now.toISOString().split('T')[0],
                createdAt: now,
                items: JSON.stringify(order.items)
            };
            
            await db.run(`
              INSERT INTO orders (id, shopId, shopName, date, status, amount, items)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
                [orderId,
                order.shopId,
                order.shopName,
                orderData.date,
                orderData.status,
                order.amount,
                orderData.items]
            );
            
            const newOrder: Order = {
                ...orderData,
                items: order.items
            };
            
            // Reset the database cache to ensure subsequent queries get fresh data
            resetDbCache();
            
            this.orders.push(newOrder);
            this.notifySubscribers();
            
            return newOrder;
        } catch (error) {
            console.error("Order placement failed: ", error);
            throw new Error("Failed to update stock. Order not placed.");
        }
    }

    async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        // Only allow database operations on the server side
        if (typeof window !== 'undefined') {
            throw new Error('Database operations are only available on the server side');
        }
        
        try {
            const db = await getDb();
            const result = await db.run(`
              UPDATE orders 
              SET status = ? 
              WHERE id = ?
            `, [newStatus, orderId]);
            
            if (result.changes > 0) {
              // Reset the database cache to ensure subsequent queries get fresh data
              resetDbCache();
            }
            
            // Update local cache
            const orderIndex = this.orders.findIndex(order => order.id === orderId);
            if (orderIndex !== -1) {
                this.orders[orderIndex].status = newStatus;
                this.notifySubscribers();
            }
        } catch (error) {
            console.error(`Failed to update status for order ${orderId}:`, error);
        }
    }
    
    // Server-side function to delete an order from database
    async deleteOrderFromDB(orderId: string): Promise<boolean> {
        try {
            const db = await getDb();
            const result = await db.run(`
                DELETE FROM orders WHERE id = ?
            `, [orderId]);
            
            const deleted = (result.changes || 0) > 0;
            if (deleted) {
              // Reset the database cache to ensure subsequent queries get fresh data
              resetDbCache();
            }
            
            // Update local cache
            const orderIndex = this.orders.findIndex(order => order.id === orderId);
            if (orderIndex !== -1) {
                this.orders.splice(orderIndex, 1);
                this.notifySubscribers();
            }
            
            return deleted;
        } catch (error) {
            console.error(`Failed to delete order ${orderId}:`, error);
            return false;
        }
    }
}

// Only export the ordersStore instance on the server side
export const ordersStore = typeof window === 'undefined' ? new OrdersManager() : null;

// Server-side function to get a single order by ID from database
export async function getOrderByIdFromDB(orderId: string): Promise<Order | null> {
  try {
    const db = await getDb();
    const order = await db.get(`
      SELECT * FROM orders
      WHERE id = ?
    `, [orderId]);
    
    if (!order) {
      return null;
    }
    
    return {
      id: order.id,
      shopId: order.shopId,
      shopName: order.shopName,
      date: order.date,
      status: order.status,
      amount: order.amount,
      items: JSON.parse(order.items),
      paymentSlipUrl: order.paymentSlipUrl,
      dispatchInfo: order.dispatchInfo ? JSON.parse(order.dispatchInfo) : undefined,
      deliveryDate: order.deliveryDate,
      isClosed: order.isClosed === 1,
      feedback: order.feedback,
      requestedDeliveryDate: order.requestedDeliveryDate,
      expectedReceiptDate: order.expectedReceiptDate,
      actualDispatchDate: order.actualDispatchDate,
      confirmationDate: order.confirmationDate,
      paymentRequested: order.paymentRequested === 1,
      createdAt: new Date(order.created_at)
    };
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    return null;
  }
}

// Server-side function to delete an order from database
export async function deleteOrderFromDB(id: string): Promise<boolean> {
    try {
        const db = await getDb();
        const result = await db.run(`
            DELETE FROM orders WHERE id = ?
        `, [id]);
        
        const deleted = (result.changes || 0) > 0;
        if (deleted) {
          // Reset the database cache to ensure subsequent queries get fresh data
          resetDbCache();
        }
        
        return deleted;
    } catch (error) {
        console.error('Error deleting order:', error);
        return false;
    }
}
