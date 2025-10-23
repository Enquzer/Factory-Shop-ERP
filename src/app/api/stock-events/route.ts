import { NextResponse } from 'next/server';
import { createStockEvent, getStockEventsForProduct, getStockEventsForVariant, getAllStockEvents } from '@/lib/stock-events-sqlite';
import { StockEvent } from '@/lib/stock-events';

// POST /api/stock-events - Create a new stock event
export async function POST(request: Request) {
  try {
    const eventData = await request.json() as Omit<StockEvent, 'id' | 'createdAt'>;
    const newEvent = await createStockEvent(eventData);
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating stock event:', error);
    return NextResponse.json({ error: 'Failed to create stock event' }, { status: 500 });
  }
}

// GET /api/stock-events - Get stock events (with query parameters for filtering)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const variantId = searchParams.get('variantId');
    
    let events: StockEvent[];
    
    if (productId) {
      events = await getStockEventsForProduct(productId);
    } else if (variantId) {
      events = await getStockEventsForVariant(variantId);
    } else {
      events = await getAllStockEvents();
    }
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching stock events:', error);
    return NextResponse.json({ error: 'Failed to fetch stock events' }, { status: 500 });
  }
}