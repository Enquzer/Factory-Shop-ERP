import { getDB, resetDbCache } from './db';
import bcrypt from 'bcryptjs';

export type Customer = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  deliveryAddress: string;
  city: string;
  preferredShopId?: string;
  createdAt: Date;
  updatedAt: Date;
};

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
  createdAt: Date;
};

export type EcommerceOrder = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  shopId: string;
  shopName: string;
  totalAmount: number;
  transportationCost?: number;
  dispatchedFromShopId?: string;
  dispatchDate?: Date;
  trackingNumber?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentReference?: string;
  latitude?: number | null;
  longitude?: number | null;
  deliveryDistance?: number | null;
  deliveryType?: 'standard' | 'express';
  cancellationReason?: string;
  orderItems: EcommerceOrderItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type EcommerceOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productVariantId: string;
  name: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
  imageUrl?: string;
};

export type SupportTicket = {
  id: string;
  orderId: string;
  customerId: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  reply?: string;
  createdAt: Date;
  updatedAt: Date;
  customerName?: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  comment?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
};

export type RareProductRequest = {
  id: string;
  customerId: string;
  customerName: string;
  productName: string;
  description: string;
  budget?: string;
  urgency: string;
  imageUrl?: string;
  status: 'pending' | 'reviewed' | 'fulfilled' | 'rejected';
  createdAt: Date;
};

export type ReturnRequest = {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  items: string; // JSON string of items to return
  reason: string;
  explanation?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Initialize database tables
export async function initializeCustomerTables() {
  try {
    const db = await getDB();
    
    // Create customers table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phone TEXT NOT NULL,
        deliveryAddress TEXT NOT NULL,
        city TEXT NOT NULL,
        preferredShopId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (preferredShopId) REFERENCES shops(id)
      )
    `);
    
    // Create cart_items table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id TEXT PRIMARY KEY,
        customerId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productVariantId TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        color TEXT NOT NULL,
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        imageUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
    
    // Create ecommerce_orders table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ecommerce_orders (
        id TEXT PRIMARY KEY,
        customerId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        customerEmail TEXT NOT NULL,
        customerPhone TEXT NOT NULL,
        deliveryAddress TEXT NOT NULL,
        city TEXT NOT NULL,
        shopId TEXT NOT NULL,
        shopName TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        transportationCost REAL DEFAULT 0,
        dispatchedFromShopId TEXT,
        dispatchDate DATETIME,
        trackingNumber TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        paymentStatus TEXT NOT NULL DEFAULT 'pending',
        paymentMethod TEXT,
        paymentReference TEXT,
        latitude REAL,
        longitude REAL,
        deliveryDistance REAL,
        deliveryType TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (shopId) REFERENCES shops(id),
        FOREIGN KEY (dispatchedFromShopId) REFERENCES shops(id)
      )
    `);

    // Add cancellationReason column if it doesn't exist
    try {
      await db.exec(`ALTER TABLE ecommerce_orders ADD COLUMN cancellationReason TEXT`);
    } catch (e) {
      // Column might already exist
    }
    
    // Create ecommerce_order_items table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ecommerce_order_items (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productVariantId TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        color TEXT NOT NULL,
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        imageUrl TEXT,
        FOREIGN KEY (orderId) REFERENCES ecommerce_orders(id) ON DELETE CASCADE
      )
    `);

    // Create ecommerce_support_tickets table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ecommerce_support_tickets (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        customerId TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        reply TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (orderId) REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    // Create product_reviews table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        customerId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      )
    `);

    // Create rare_product_requests table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS rare_product_requests (
        id TEXT PRIMARY KEY,
        customerId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        productName TEXT NOT NULL,
        description TEXT NOT NULL,
        budget TEXT,
        urgency TEXT DEFAULT 'normal',
        imageUrl TEXT,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      )
    `);

    // Create return_requests table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS return_requests (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        customerId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        items TEXT NOT NULL,
        reason TEXT NOT NULL,
        explanation TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        adminNotes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (orderId) REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);


    
    console.log('Customer tables initialized successfully');
  } catch (error) {
    console.error('Error initializing customer tables:', error);
    throw error;
  }
}

// Customer functions
export async function createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  try {
    const db = await getDB();
    const id = `CUST-${Date.now()}`;
    
    const result = await db.run(`
      INSERT INTO customers (id, username, email, firstName, lastName, phone, deliveryAddress, city, preferredShopId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      customerData.username,
      customerData.email,
      customerData.firstName,
      customerData.lastName,
      customerData.phone,
      customerData.deliveryAddress,
      customerData.city,
      customerData.preferredShopId
    ]);
    
    const customer = await getCustomerById(id);
    if (!customer) {
      throw new Error('Failed to create customer');
    }
    
    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const db = await getDB();
    const customer = await db.get(`
      SELECT * FROM customers WHERE id = ?
    `, [id]);
    
    return customer ? {
      ...customer,
      createdAt: new Date(customer.createdAt),
      updatedAt: new Date(customer.updatedAt)
    } : null;
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}

export async function getCustomerByUsername(username: string): Promise<Customer | null> {
  try {
    const db = await getDB();
    const customer = await db.get(`
      SELECT * FROM customers WHERE username = ?
    `, [username]);
    
    return customer ? {
      ...customer,
      createdAt: new Date(customer.createdAt),
      updatedAt: new Date(customer.updatedAt)
    } : null;
  } catch (error) {
    console.error('Error fetching customer by username:', error);
    return null;
  }
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const db = await getDB();
    const customer = await db.get(`
      SELECT * FROM customers WHERE email = ?
    `, [email]);
    
    return customer ? {
      ...customer,
      createdAt: new Date(customer.createdAt),
      updatedAt: new Date(customer.updatedAt)
    } : null;
  } catch (error) {
    console.error('Error fetching customer by email:', error);
    return null;
  }
}

export async function updateCustomer(id: string, updateData: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
  try {
    const db = await getDB();
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    values.push(id);
    
    await db.run(`
      UPDATE customers SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `, values);
    
    return true;
  } catch (error) {
    console.error('Error updating customer:', error);
    return false;
  }
}

// Cart functions
export async function getCartItems(customerId: string): Promise<CartItem[]> {
  try {
    const db = await getDB();
    const items = await db.all(`
      SELECT * FROM cart_items WHERE customerId = ? ORDER BY createdAt DESC
    `, [customerId]);
    
    return items.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt)
    }));
  } catch (error) {
    // Error occurred
    return [];
  }
}

export async function addCartItem(customerId: string, item: Omit<CartItem, 'id' | 'customerId' | 'createdAt'>): Promise<CartItem> {
  try {
    const db = await getDB();
    const id = `CART-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await db.run(`
      INSERT INTO cart_items (id, customerId, productId, productVariantId, name, price, color, size, quantity, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      customerId,
      item.productId,
      item.productVariantId,
      item.name,
      item.price,
      item.color,
      item.size,
      item.quantity,
      item.imageUrl
    ]);
    
    const cartItem = await db.get(`SELECT * FROM cart_items WHERE id = ?`, [id]);
    return {
      ...cartItem,
      createdAt: new Date(cartItem.createdAt)
    };
  } catch (error) {
    // Error occurred
    throw error;
  }
}

export async function updateCartItemQuantity(id: string, quantity: number): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`
      UPDATE cart_items SET quantity = ? WHERE id = ?
    `, [quantity, id]);
    return true;
  } catch (error) {
    // Error occurred
    return false;
  }
}

export async function removeCartItem(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`DELETE FROM cart_items WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    // Error occurred
    return false;
  }
}

export async function clearCart(customerId: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`DELETE FROM cart_items WHERE customerId = ?`, [customerId]);
    return true;
  } catch (error) {
    // Error occurred
    return false;
  }
}

// Order functions
export async function createEcommerceOrder(orderData: Omit<EcommerceOrder, 'id' | 'createdAt' | 'updatedAt' | 'orderItems'>, items: Omit<EcommerceOrderItem, 'id' | 'orderId'>[]): Promise<EcommerceOrder> {
  try {
    const db = await getDB();
    const orderId = `ECOM-${Date.now()}`;
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Create order
      await db.run(`
        INSERT INTO ecommerce_orders (
          id, customerId, customerName, customerEmail, customerPhone, 
          deliveryAddress, city, shopId, shopName, totalAmount, 
          transportationCost, status, paymentStatus, paymentMethod,
          latitude, longitude, deliveryDistance, deliveryType
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        orderData.customerId,
        orderData.customerName,
        orderData.customerEmail,
        orderData.customerPhone,
        orderData.deliveryAddress,
        orderData.city,
        orderData.shopId,
        orderData.shopName,
        orderData.totalAmount,
        orderData.transportationCost || 0,
        orderData.status,
        orderData.paymentStatus,
        orderData.paymentMethod || null,
        orderData.latitude || null,
        orderData.longitude || null,
        orderData.deliveryDistance || 0,
        orderData.deliveryType || 'standard'
      ]);
      
      // Create order items
      for (const item of items) {
        const itemId = `ECOM-ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.run(`
          INSERT INTO ecommerce_order_items (id, orderId, productId, productVariantId, name, price, color, size, quantity, imageUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          orderId,
          item.productId,
          item.productVariantId,
          item.name,
          item.price,
          item.color,
          item.size,
          item.quantity,
          item.imageUrl
        ]);
      }
      
      // Commit transaction
      await db.run('COMMIT');
      
      // Fetch the created order
      const order = await getEcommerceOrderById(orderId);
      if (!order) {
        throw new Error('Failed to create order');
      }
      
      return order;
    } catch (error) {
      // Rollback transaction on error
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating ecommerce order:', error);
    throw error;
  }
}

export async function getEcommerceOrderById(id: string): Promise<EcommerceOrder | null> {
  try {
    const db = await getDB();
    
    // Get order
    const order = await db.get(`
      SELECT * FROM ecommerce_orders WHERE id = ?
    `, [id]);
    
    if (!order) {
      return null;
    }
    
    // Get order items
    const items = await db.all(`
      SELECT * FROM ecommerce_order_items WHERE orderId = ?
    `, [id]);
    
    return {
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      orderItems: items
    };
  } catch (error) {
    console.error('Error fetching ecommerce order:', error);
    return null;
  }
}

export async function getCustomerOrders(customerId: string): Promise<EcommerceOrder[]> {
  try {
    const db = await getDB();
    
    // Get orders
    const orders = await db.all(`
      SELECT * FROM ecommerce_orders WHERE customerId = ? ORDER BY createdAt DESC
    `, [customerId]);
    
    // Get order items for each order
    const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
      const items = await db.all(`
        SELECT * FROM ecommerce_order_items WHERE orderId = ?
      `, [order.id]);
      
      return {
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        orderItems: items
      };
    }));
    
    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: EcommerceOrder['status']): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`
      UPDATE ecommerce_orders SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `, [status, orderId]);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: EcommerceOrder['paymentStatus'], paymentMethod?: string, paymentReference?: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`
      UPDATE ecommerce_orders 
      SET paymentStatus = ?, paymentMethod = ?, paymentReference = ?, updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [paymentStatus, paymentMethod, paymentReference, orderId]);
    return true;
  } catch (error) {
    console.error('Error updating order payment status:', error);
    return false;
  }
}

export async function updateEcommerceOrder(orderId: string, data: Partial<EcommerceOrder>): Promise<boolean> {
  try {
    const db = await getDB();
    const entries = Object.entries(data).filter(([key, value]) => 
      !['id', 'customerId', 'createdAt', 'updatedAt', 'orderItems'].includes(key) && value !== undefined
    );
    
    if (entries.length === 0) return true;
    
    const sets = entries.map(([key]) => `${key} = ?`);
    const params = entries.map(([_, value]) => value);
    
    params.push(orderId);
    
    await db.run(`
      UPDATE ecommerce_orders 
      SET ${sets.join(', ')}, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, params);
    
    return true;
  } catch (error) {
    console.error('Error updating ecommerce order:', error);
    return false;
  }
}

// Support functions
export async function createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reply'>): Promise<SupportTicket> {
  try {
    const db = await getDB();
    const id = `TKT-${Date.now()}`;
    
    await db.run(`
      INSERT INTO ecommerce_support_tickets (id, orderId, customerId, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `, [id, ticket.orderId, ticket.customerId, ticket.subject, ticket.message]);
    
    const created = await db.get(`SELECT * FROM ecommerce_support_tickets WHERE id = ?`, [id]);
    return {
      ...created,
      createdAt: new Date(created.createdAt),
      updatedAt: new Date(created.updatedAt)
    };
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
}

export async function getSupportTicketsByOrder(orderId: string): Promise<SupportTicket[]> {
  try {
    const db = await getDB();
    const tickets = await db.all(`
      SELECT * FROM ecommerce_support_tickets WHERE orderId = ? ORDER BY createdAt DESC
    `, [orderId]);
    
    return tickets.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return [];
  }
}

export async function updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<boolean> {
  try {
    const db = await getDB();
    const entries = Object.entries(data).filter(([key]) => !['id', 'orderId', 'customerId', 'createdAt', 'updatedAt'].includes(key));
    if (entries.length === 0) return true;
    
    const sets = entries.map(([key]) => `${key} = ?`);
    const params = entries.map(([_, value]) => value);
    params.push(id);
    
    await db.run(`
      UPDATE ecommerce_support_tickets SET ${sets.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `, params);
    return true;
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return false;
  }
}

export async function getAllSupportTickets(): Promise<SupportTicket[]> {
  try {
    const db = await getDB();
    const tickets = await db.all(`
      SELECT t.*, c.firstName || ' ' || c.lastName as customerName, c.username
      FROM ecommerce_support_tickets t
      LEFT JOIN customers c ON t.customerId = c.id
      ORDER BY t.createdAt DESC
    `, []);
    
    return tickets.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching all support tickets:', error);
    return [];
  }
}

// Product Review Functions
export async function createProductReview(review: Omit<ProductReview, 'id' | 'createdAt' | 'status'>): Promise<ProductReview> {
  try {
    const db = await getDB();
    const id = `REV-${Date.now()}`;
    
    await db.run(`
      INSERT INTO product_reviews (id, productId, customerId, customerName, rating, comment, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [id, review.productId, review.customerId, review.customerName, review.rating, review.comment]);
    
    const created = await db.get(`SELECT * FROM product_reviews WHERE id = ?`, [id]);
    return {
      ...created,
      createdAt: new Date(created.createdAt)
    };
  } catch (error) {
    console.error('Error creating product review:', error);
    throw error;
  }
}

// Rare Product Request Functions
export async function createRareProductRequest(request: Omit<RareProductRequest, 'id' | 'createdAt' | 'status'>): Promise<RareProductRequest> {
  try {
    const db = await getDB();
    const id = `RARE-${Date.now()}`;
    
    await db.run(`
      INSERT INTO rare_product_requests (id, customerId, customerName, productName, description, budget, urgency, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      request.customerId,
      request.customerName,
      request.productName,
      request.description,
      request.budget,
      request.urgency,
      request.imageUrl
    ]);
    
    const created = await db.get(`SELECT * FROM rare_product_requests WHERE id = ?`, [id]);
    return {
      ...created,
      createdAt: new Date(created.createdAt)
    };
  } catch (error) {
    console.error('Error creating rare product request:', error);
    throw error;
  }
}

export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  try {
    const db = await getDB();
    const reviews = await db.all(`
      SELECT * FROM product_reviews WHERE productId = ? AND status = 'approved' ORDER BY createdAt DESC
    `, [productId]);
    
    return reviews.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return [];
  }
}

export async function getAllProductReviews(): Promise<ProductReview[]> {
  try {
    const db = await getDB();
    const reviews = await db.all(`
      SELECT * FROM product_reviews ORDER BY createdAt DESC
    `);
    
    return reviews.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching all product reviews:', error);
    return [];
  }
}

export async function updateProductReviewStatus(id: string, status: ProductReview['status']): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`
      UPDATE product_reviews SET status = ? WHERE id = ?
    `, [status, id]);
    return true;
  } catch (error) {
    console.error('Error updating review status:', error);
    return false;
  }
}

export async function getAllRareProductRequests(): Promise<RareProductRequest[]> {
  try {
    const db = await getDB();
    const requests = await db.all(`
      SELECT * FROM rare_product_requests ORDER BY createdAt DESC
    `, []);
    
    return requests.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching all rare product requests:', error);
    return [];
  }
}

export async function updateRareProductRequestStatus(id: string, status: string): Promise<boolean> {
  try {
    const db = await getDB();
    const result = await db.run(`
      UPDATE rare_product_requests 
      SET status = ? 
      WHERE id = ?
    `, [status, id]);
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error updating rare product request status:', error);
    return false;
  }
}

// Return Request Functions
export async function createReturnRequest(request: Omit<ReturnRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'adminNotes'>): Promise<ReturnRequest> {
  try {
    const db = await getDB();
    const id = `RET-${Date.now()}`;
    
    await db.run(`
      INSERT INTO return_requests (id, orderId, customerId, customerName, items, reason, explanation, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      id,
      request.orderId,
      request.customerId,
      request.customerName,
      request.items,
      request.reason,
      request.explanation
    ]);
    
    const created = await db.get(`SELECT * FROM return_requests WHERE id = ?`, [id]);
    return {
      ...created,
      createdAt: new Date(created.createdAt),
      updatedAt: new Date(created.updatedAt)
    };
  } catch (error) {
    console.error('Error creating return request:', error);
    throw error;
  }
}

export async function getAllReturnRequests(): Promise<ReturnRequest[]> {
  try {
    const db = await getDB();
    const requests = await db.all(`
      SELECT r.*, o.id as orderId
      FROM return_requests r
      LEFT JOIN ecommerce_orders o ON r.orderId = o.id
      ORDER BY r.createdAt DESC
    `);
    
    return requests.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching all return requests:', error);
    return [];
  }
}

export async function getReturnRequestsByCustomer(customerId: string): Promise<ReturnRequest[]> {
  try {
    const db = await getDB();
    const requests = await db.all(`
      SELECT * FROM return_requests WHERE customerId = ? ORDER BY createdAt DESC
    `, [customerId]);
    
    return requests.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching customer return requests:', error);
    return [];
  }
}

export async function updateReturnRequestStatus(id: string, status: string, adminNotes?: string): Promise<boolean> {
  try {
    const db = await getDB();
    const result = await db.run(`
      UPDATE return_requests 
      SET status = ?, adminNotes = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, adminNotes || null, id]);
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error updating return request status:', error);
    return false;
  }
}
