import { getDb } from './db';

export type MarketingOrderStatus = 
  'Placed Order' | 
  'Cutting' | 
  'Production' | 
  'Packing' | 
  'Delivery' | 
  'Completed';

export type MarketingOrderItem = {
  id?: number;
  orderId: string;
  size: string;
  color: string;
  quantity: number;
};

export type DailyProductionStatus = {
  id?: number;
  orderId: string;
  date: string;
  size: string;
  color: string;
  quantity: number;
  status: string;
};

export type MarketingOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  productCode: string;
  description?: string;
  quantity: number;
  status: MarketingOrderStatus;
  cuttingStatus?: string;
  productionStatus?: string;
  packingStatus?: string;
  deliveryStatus?: string;
  assignedTo?: string;
  dueDate?: string;
  completedDate?: string;
  pdfUrl?: string;
  imageUrl?: string;
  isCompleted: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  orderPlacementDate?: string;
  plannedDeliveryDate?: string;
  sizeSetSampleApproved?: string;
  productionStartDate?: string;
  productionFinishedDate?: string;
  items: MarketingOrderItem[];
};

// Client-side function to fetch marketing orders from API
export async function getMarketingOrders(): Promise<MarketingOrder[]> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders`
      : '/api/marketing-orders';
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch marketing orders');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching marketing orders:', error);
    return [];
  }
}

// Client-side function to get a specific marketing order by ID
export async function getMarketingOrderById(id: string): Promise<MarketingOrder | null> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/${id}`
      : `/api/marketing-orders/${id}`;
      
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching marketing order:', error);
    return null;
  }
}

// Client-side function to create a new marketing order
export async function createMarketingOrder(order: Omit<MarketingOrder, 'id' | 'createdAt' | 'updatedAt' | 'items'> & { items: Omit<MarketingOrderItem, 'id' | 'orderId'>[] } & { isNewProduct?: boolean, category?: string, price?: number, imageUrl?: string }): Promise<MarketingOrder> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders`
      : '/api/marketing-orders';
      
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'Failed to create marketing order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating marketing order:', error);
    throw error;
  }
}

// Client-side function to update a marketing order
export async function updateMarketingOrder(id: string, order: Partial<MarketingOrder>): Promise<boolean> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/${id}`
      : `/api/marketing-orders/${id}`;
      
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error updating marketing order:', error);
    return false;
  }
}

// Client-side function to delete a marketing order
export async function deleteMarketingOrder(id: string): Promise<boolean> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/${id}`
      : `/api/marketing-orders/${id}`;
      
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting marketing order:', error);
    return false;
  }
}

// Server-side function to get all marketing orders from database
export async function getMarketingOrdersFromDB(): Promise<MarketingOrder[]> {
  try {
    const db = await getDb();
    const orders = await db.all(`
      SELECT * FROM marketing_orders
      ORDER BY createdAt DESC
    `);
    
    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await db.all(`
          SELECT * FROM marketing_order_items 
          WHERE orderId = ?
        `, order.id);
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          productName: order.productName,
          productCode: order.productCode,
          description: order.description,
          quantity: order.quantity,
          status: order.status,
          cuttingStatus: order.cuttingStatus,
          productionStatus: order.productionStatus,
          packingStatus: order.packingStatus,
          deliveryStatus: order.deliveryStatus,
          assignedTo: order.assignedTo,
          dueDate: order.dueDate,
          completedDate: order.completedDate,
          pdfUrl: order.pdfUrl,
          imageUrl: order.imageUrl,
          isCompleted: order.isCompleted === 1,
          createdBy: order.createdBy,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
          orderPlacementDate: order.orderPlacementDate,
          plannedDeliveryDate: order.plannedDeliveryDate,
          sizeSetSampleApproved: order.sizeSetSampleApproved,
          productionStartDate: order.productionStartDate,
          productionFinishedDate: order.productionFinishedDate,
          items: items.map((item: any) => ({
            id: item.id,
            orderId: item.orderId,
            size: item.size,
            color: item.color,
            quantity: item.quantity
          }))
        };
      })
    );
    
    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching marketing orders:', error);
    return [];
  }
}

// Server-side function to get a specific marketing order by ID
export async function getMarketingOrderByIdFromDB(id: string): Promise<MarketingOrder | null> {
  try {
    const db = await getDb();
    const order = await db.get(`
      SELECT * FROM marketing_orders 
      WHERE id = ?
    `, id);
    
    if (!order) {
      return null;
    }
    
    // Get items for the order
    const items = await db.all(`
      SELECT * FROM marketing_order_items 
      WHERE orderId = ?
    `, id);
    
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productName: order.productName,
      productCode: order.productCode,
      description: order.description,
      quantity: order.quantity,
      status: order.status,
      cuttingStatus: order.cuttingStatus,
      productionStatus: order.productionStatus,
      packingStatus: order.packingStatus,
      deliveryStatus: order.deliveryStatus,
      assignedTo: order.assignedTo,
      dueDate: order.dueDate,
      completedDate: order.completedDate,
      pdfUrl: order.pdfUrl,
      imageUrl: order.imageUrl,
      isCompleted: order.isCompleted === 1,
      createdBy: order.createdBy,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      orderPlacementDate: order.orderPlacementDate,
      plannedDeliveryDate: order.plannedDeliveryDate,
      sizeSetSampleApproved: order.sizeSetSampleApproved,
      productionStartDate: order.productionStartDate,
      productionFinishedDate: order.productionFinishedDate,
      items: items.map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        size: item.size,
        color: item.color,
        quantity: item.quantity
      }))
    };
  } catch (error) {
    console.error('Error fetching marketing order:', error);
    return null;
  }
}

// Server-side function to create a new marketing order in database
export async function createMarketingOrderInDB(order: Omit<MarketingOrder, 'id' | 'createdAt' | 'updatedAt'> & { items: Omit<MarketingOrderItem, 'id' | 'orderId'>[] }): Promise<MarketingOrder> {
  try {
    const db = await getDb();
    
    // Generate order ID
    const orderId = `MKT-ORD-${Date.now()}`;
    
    // Generate order number if not provided
    let orderNumber = order.orderNumber;
    if (!orderNumber) {
      // Generate order number in format CM-YYYY-XXXX where XXXX is a sequential number
      const year = new Date().getFullYear();
      
      // Get the count of orders for this year to generate a sequential number
      const orderCountResult = await db.get(`
        SELECT COUNT(*) as count FROM marketing_orders 
        WHERE orderNumber LIKE ?
      `, `CM-${year}-%`);
      
      const orderCount = orderCountResult?.count || 0;
      const nextNumber = orderCount + 1;
      orderNumber = `CM-${year}-${nextNumber.toString().padStart(4, '0')}`;
    }
    
    // Set order placement date to current date if not provided
    const orderPlacementDate = order.orderPlacementDate || new Date().toISOString().split('T')[0];
    
    // Insert order into database
    await db.run(`
      INSERT INTO marketing_orders (
        id, orderNumber, productName, productCode, description, quantity, status, 
        cuttingStatus, productionStatus, packingStatus, deliveryStatus, assignedTo, 
        dueDate, completedDate, pdfUrl, imageUrl, isCompleted, createdBy, createdAt, updatedAt,
        orderPlacementDate, plannedDeliveryDate, sizeSetSampleApproved, productionStartDate, productionFinishedDate
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?)
    `,
      orderId,
      orderNumber,
      order.productName,
      order.productCode,
      order.description,
      order.quantity,
      order.status,
      order.cuttingStatus,
      order.productionStatus,
      order.packingStatus,
      order.deliveryStatus,
      order.assignedTo,
      order.dueDate,
      order.completedDate,
      order.pdfUrl,
      order.imageUrl,
      order.isCompleted ? 1 : 0,
      order.createdBy,
      orderPlacementDate,
      order.plannedDeliveryDate,
      order.sizeSetSampleApproved,
      order.productionStartDate,
      order.productionFinishedDate
    );
    
    // Insert items into database
    const itemsWithOrderId = order.items.map(item => ({
      ...item,
      orderId: orderId
    }));
    
    for (const item of itemsWithOrderId) {
      await db.run(`
        INSERT INTO marketing_order_items (orderId, size, color, quantity)
        VALUES (?, ?, ?, ?)
      `, item.orderId, item.size, item.color, item.quantity);
    }
    
    // Return the created order with items
    return {
      ...order,
      id: orderId,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      orderPlacementDate,
      items: itemsWithOrderId.map((item, index) => ({
        ...item,
        id: index + 1 // Temporary ID, would be replaced with real ID from DB in a real implementation
      }))
    };
  } catch (error) {
    console.error('Error creating marketing order:', error);
    throw error;
  }
}

// Server-side function to update a marketing order in database
export async function updateMarketingOrderInDB(id: string, order: Partial<MarketingOrder>): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Build dynamic update query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    
    if (order.orderNumber !== undefined) {
      fields.push('orderNumber = ?');
      values.push(order.orderNumber);
    }
    if (order.productName !== undefined) {
      fields.push('productName = ?');
      values.push(order.productName);
    }
    if (order.productCode !== undefined) {
      fields.push('productCode = ?');
      values.push(order.productCode);
    }
    if (order.description !== undefined) {
      fields.push('description = ?');
      values.push(order.description);
    }
    if (order.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(order.quantity);
    }
    if (order.status !== undefined) {
      fields.push('status = ?');
      values.push(order.status);
    }
    if (order.cuttingStatus !== undefined) {
      fields.push('cuttingStatus = ?');
      values.push(order.cuttingStatus);
    }
    if (order.productionStatus !== undefined) {
      fields.push('productionStatus = ?');
      values.push(order.productionStatus);
    }
    if (order.packingStatus !== undefined) {
      fields.push('packingStatus = ?');
      values.push(order.packingStatus);
    }
    if (order.deliveryStatus !== undefined) {
      fields.push('deliveryStatus = ?');
      values.push(order.deliveryStatus);
    }
    if (order.assignedTo !== undefined) {
      fields.push('assignedTo = ?');
      values.push(order.assignedTo);
    }
    if (order.dueDate !== undefined) {
      fields.push('dueDate = ?');
      values.push(order.dueDate);
    }
    if (order.completedDate !== undefined) {
      fields.push('completedDate = ?');
      values.push(order.completedDate);
    }
    if (order.pdfUrl !== undefined) {
      fields.push('pdfUrl = ?');
      values.push(order.pdfUrl);
    }
    if (order.imageUrl !== undefined) {
      fields.push('imageUrl = ?');
      values.push(order.imageUrl);
    }
    if (order.isCompleted !== undefined) {
      fields.push('isCompleted = ?');
      values.push(order.isCompleted ? 1 : 0);
    }
    if (order.orderPlacementDate !== undefined) {
      fields.push('orderPlacementDate = ?');
      values.push(order.orderPlacementDate);
    }
    if (order.plannedDeliveryDate !== undefined) {
      fields.push('plannedDeliveryDate = ?');
      values.push(order.plannedDeliveryDate);
    }
    if (order.sizeSetSampleApproved !== undefined) {
      fields.push('sizeSetSampleApproved = ?');
      values.push(order.sizeSetSampleApproved);
    }
    if (order.productionStartDate !== undefined) {
      fields.push('productionStartDate = ?');
      values.push(order.productionStartDate);
    }
    if (order.productionFinishedDate !== undefined) {
      fields.push('productionFinishedDate = ?');
      values.push(order.productionFinishedDate);
    }
    
    // Always update the updatedAt field
    fields.push('updatedAt = datetime("now")');
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE marketing_orders SET ${fields.join(', ')} WHERE id = ?`;
      await db.run(query, ...values);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating marketing order:', error);
    return false;
  }
}

// Server-side function to delete a marketing order from database
export async function deleteMarketingOrderFromDB(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.run(`
      DELETE FROM marketing_orders WHERE id = ?
    `, id);
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error deleting marketing order:', error);
    return false;
  }
}

// Server-side function to get daily production status for an order
export async function getDailyProductionStatus(orderId: string): Promise<DailyProductionStatus[]> {
  try {
    const db = await getDb();
    const statuses = await db.all(`
      SELECT * FROM daily_production_status 
      WHERE orderId = ?
      ORDER BY date DESC
    `, orderId);
    
    return statuses.map((status: any) => ({
      id: status.id,
      orderId: status.orderId,
      date: status.date,
      size: status.size,
      color: status.color,
      quantity: status.quantity,
      status: status.status
    }));
  } catch (error) {
    console.error('Error fetching daily production status:', error);
    return [];
  }
}

// Server-side function to add/update daily production status
export async function updateDailyProductionStatus(status: Omit<DailyProductionStatus, 'id'>): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Check if status entry already exists for this order/date/size/color combination
    const existingStatus = await db.get(`
      SELECT id FROM daily_production_status 
      WHERE orderId = ? AND date = ? AND size = ? AND color = ?
    `, status.orderId, status.date, status.size, status.color);
    
    if (existingStatus) {
      // Update existing entry
      await db.run(`
        UPDATE daily_production_status 
        SET quantity = ?, status = ?
        WHERE id = ?
      `, status.quantity, status.status, existingStatus.id);
    } else {
      // Insert new entry
      await db.run(`
        INSERT INTO daily_production_status (orderId, date, size, color, quantity, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, status.orderId, status.date, status.size, status.color, status.quantity, status.status);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating daily production status:', error);
    return false;
  }
}