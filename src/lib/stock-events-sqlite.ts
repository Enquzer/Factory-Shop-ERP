import { getDb } from './db';

export type StockEvent = {
  id: number;
  productId: string;
  variantId: string;
  type: 'Stock In' | 'Stock Out';
  quantity: number;
  reason: 'Initial stock' | 'Manual adjustment' | 'Order fulfillment' | 'Return' | 'Replenishment';
  createdAt: Date;
};

// Create a stock event
export async function createStockEvent(event: Omit<StockEvent, 'id' | 'createdAt'>): Promise<StockEvent> {
  try {
    const db = await getDb();
    const result = await db.run(`
      INSERT INTO stock_events (productId, variantId, type, quantity, reason)
      VALUES (?, ?, ?, ?, ?)
    `,
      event.productId,
      event.variantId,
      event.type,
      event.quantity,
      event.reason
    );
    
    return {
      id: result.lastID ?? 0,
      productId: event.productId,
      variantId: event.variantId,
      type: event.type,
      quantity: event.quantity,
      reason: event.reason,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error creating stock event:', error);
    throw error;
  }
}

// Get stock events for a product
export async function getStockEventsForProduct(productId: string): Promise<StockEvent[]> {
  try {
    const db = await getDb();
    const events = await db.all(`
      SELECT * FROM stock_events 
      WHERE productId = ? 
      ORDER BY created_at DESC
    `, productId);
    
    return events.map((event: any) => ({
      ...event,
      createdAt: new Date(event.created_at)
    })) as StockEvent[];
  } catch (error) {
    console.error('Error fetching stock events for product:', error);
    return [];
  }
}

// Get stock events for a variant
export async function getStockEventsForVariant(variantId: string): Promise<StockEvent[]> {
  try {
    const db = await getDb();
    const events = await db.all(`
      SELECT * FROM stock_events 
      WHERE variantId = ? 
      ORDER BY created_at DESC
    `, variantId);
    
    return events.map((event: any) => ({
      ...event,
      createdAt: new Date(event.created_at)
    })) as StockEvent[];
  } catch (error) {
    console.error('Error fetching stock events for variant:', error);
    return [];
  }
}

// Get all stock events
export async function getAllStockEvents(): Promise<StockEvent[]> {
  try {
    const db = await getDb();
    const events = await db.all(`
      SELECT * FROM stock_events 
      ORDER BY created_at DESC
    `);
    
    return events.map((event: any) => ({
      ...event,
      createdAt: new Date(event.created_at)
    })) as StockEvent[];
  } catch (error) {
    console.error('Error fetching all stock events:', error);
    return [];
  }
}