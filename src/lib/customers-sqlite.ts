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
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentReference?: string;
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
        status TEXT NOT NULL DEFAULT 'pending',
        paymentStatus TEXT NOT NULL DEFAULT 'pending',
        paymentMethod TEXT,
        paymentReference TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id),
        FOREIGN KEY (shopId) REFERENCES shops(id)
      )
    `);
    
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
    console.error('Error fetching cart items:', error);
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
    console.error('Error adding cart item:', error);
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
    console.error('Error updating cart item quantity:', error);
    return false;
  }
}

export async function removeCartItem(id: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`DELETE FROM cart_items WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error('Error removing cart item:', error);
    return false;
  }
}

export async function clearCart(customerId: string): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(`DELETE FROM cart_items WHERE customerId = ?`, [customerId]);
    return true;
  } catch (error) {
    console.error('Error clearing cart:', error);
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
        INSERT INTO ecommerce_orders (id, customerId, customerName, customerEmail, customerPhone, deliveryAddress, city, shopId, shopName, totalAmount, status, paymentStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        orderData.status,
        orderData.paymentStatus
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