import { NextRequest, NextResponse } from 'next/server';
import { getCartItems, addCartItem, initializeCustomerTables } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

// Initialize tables on first load of this route
let tablesInitialized = false;

async function ensureTables() {
  if (!tablesInitialized) {
    try {
      await initializeCustomerTables();
      tablesInitialized = true;
    } catch (err) {
      console.error('Failed to initialize customer tables:', err);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'customer' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Using username as identifier for consistency with auth middleware and previous patterns
    const cartItems = await getCartItems(authResult.username);
    
    return NextResponse.json({ items: cartItems });
  } catch (error) {
    console.error('API Cart GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables();
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'customer' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { productId, productVariantId, name, price, color, size, quantity, imageUrl } = body;
    
    if (!productId || !productVariantId || !name || price === undefined || !color || !size || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const cartItem = await addCartItem(authResult.username, {
      productId,
      productVariantId,
      name,
      price,
      color,
      size,
      quantity,
      imageUrl
    });
    
    return NextResponse.json({ item: cartItem }, { status: 201 });
  } catch (error) {
    console.error('API Cart POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}