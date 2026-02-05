import { getDB } from './db';
import { 
  getEcommerceOrderById, 
  updateOrderStatus,
  EcommerceOrder 
} from './customers-sqlite';

// Get all eCommerce orders
export async function getAllEcommerceOrders(): Promise<EcommerceOrder[]> {
  try {
    const db = await getDB();
    
    const orders = await db.all(`
      SELECT * FROM ecommerce_orders ORDER BY createdAt DESC
    `);
    
    const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
      const items = await db.all(`
        SELECT * FROM ecommerce_order_items WHERE orderId = ?
      `, [order.id]);
      
      return {
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        dispatchDate: order.dispatchDate ? new Date(order.dispatchDate) : undefined,
        orderItems: items
      };
    }));
    
    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching all ecommerce orders:', error);
    return [];
  }
}

// Update eCommerce order with dispatch details
export async function updateEcommerceOrder(
  orderId: string, 
  updateData: {
    status?: string;
    transportationCost?: number;
    dispatchedFromShopId?: string;
    dispatchDate?: Date;
    trackingNumber?: string;
    paymentStatus?: string;
  }
): Promise<boolean> {
  try {
    const db = await getDB();
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        if (value instanceof Date) {
          values.push(value.toISOString());
        } else {
          values.push(value);
        }
      }
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    values.push(orderId);
    
    await db.run(`
      UPDATE ecommerce_orders SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?
    `, values);
    
    return true;
  } catch (error) {
    console.error('Error updating ecommerce order:', error);
    return false;
  }
}

// Get orders by shop (for shop-specific analytics)
export async function getEcommerceOrdersByShop(shopId: string): Promise<EcommerceOrder[]> {
  try {
    const db = await getDB();
    
    const orders = await db.all(`
      SELECT * FROM ecommerce_orders 
      WHERE shopId = ? OR dispatchedFromShopId = ? 
      ORDER BY createdAt DESC
    `, [shopId, shopId]);
    
    const ordersWithItems = await Promise.all(orders.map(async (order: any) => {
      const items = await db.all(`
        SELECT * FROM ecommerce_order_items WHERE orderId = ?
      `, [order.id]);
      
      return {
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        dispatchDate: order.dispatchDate ? new Date(order.dispatchDate) : undefined,
        orderItems: items
      };
    }));
    
    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching ecommerce orders by shop:', error);
    return [];
  }
}

// Get eCommerce analytics for a shop
export async function getShopEcommerceAnalytics(shopId: string, startDate?: Date, endDate?: Date) {
  try {
    const db = await getDB();
    
    let dateFilter = '';
    const params: any[] = [shopId, shopId];
    
    if (startDate && endDate) {
      dateFilter = 'AND createdAt BETWEEN ? AND ?';
      params.push(startDate.toISOString(), endDate.toISOString());
    }
    
    const analytics = await db.get(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(totalAmount) as totalRevenue,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders
      FROM ecommerce_orders 
      WHERE (shopId = ? OR dispatchedFromShopId = ?) ${dateFilter}
    `, params);
    
    // Get total pieces sold
    const piecesData = await db.get(`
      SELECT SUM(eoi.quantity) as totalPieces
      FROM ecommerce_order_items eoi
      JOIN ecommerce_orders eo ON eoi.orderId = eo.id
      WHERE (eo.shopId = ? OR eo.dispatchedFromShopId = ?) ${dateFilter}
    `, params);
    
    return {
      ...analytics,
      totalPieces: piecesData?.totalPieces || 0
    };
  } catch (error) {
    console.error('Error fetching shop ecommerce analytics:', error);
    return null;
  }
}

// Get overall eCommerce analytics
export async function getOverallEcommerceAnalytics(startDate?: Date, endDate?: Date) {
  try {
    const db = await getDB();
    
    let dateFilter = '';
    const params: any[] = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE createdAt BETWEEN ? AND ?';
      params.push(startDate.toISOString(), endDate.toISOString());
    }
    
    const analytics = await db.get(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(totalAmount) as totalRevenue,
        SUM(transportationCost) as totalTransportationCost,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as deliveredOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processingOrders,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shippedOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders
      FROM ecommerce_orders ${dateFilter}
    `, params);
    
    // Get total pieces sold
    const piecesData = await db.get(`
      SELECT SUM(quantity) as totalPieces
      FROM ecommerce_order_items eoi
      JOIN ecommerce_orders eo ON eoi.orderId = eo.id
      ${dateFilter}
    `, params);
    
    return {
      ...analytics,
      totalPieces: piecesData?.totalPieces || 0
    };
  } catch (error) {
    console.error('Error fetching overall ecommerce analytics:', error);
    return null;
  }
}

// Reduce shop inventory when order is dispatched
export async function reduceShopInventory(shopId: string, orderItems: any[]): Promise<boolean> {
  try {
    const db = await getDB();
    
    for (const item of orderItems) {
      // Reduce shop inventory for the variant
      await db.run(`
        UPDATE shop_inventory 
        SET quantity = quantity - ? 
        WHERE shopId = ? AND productVariantId = ?
      `, [item.quantity, shopId, item.productVariantId]);
    }
    
    return true;
  } catch (error) {
    console.error('Error reducing shop inventory:', error);
    return false;
  }
}
