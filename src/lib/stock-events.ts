// Client-side functions that call the API
import { StockEvent } from './stock-events-sqlite';

// Create a stock event via API
export async function createStockEvent(event: Omit<StockEvent, 'id' | 'createdAt'>): Promise<StockEvent> {
  const response = await fetch('/api/stock-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create stock event');
  }
  
  return await response.json();
}

// Get stock events for a product via API
export async function getStockEventsForProduct(productId: string): Promise<StockEvent[]> {
  const response = await fetch(`/api/stock-events?productId=${productId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch stock events for product');
  }
  
  return await response.json();
}

// Get stock events for a variant via API
export async function getStockEventsForVariant(variantId: string): Promise<StockEvent[]> {
  const response = await fetch(`/api/stock-events?variantId=${variantId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch stock events for variant');
  }
  
  return await response.json();
}

// Export the types
export type { StockEvent } from './stock-events-sqlite';