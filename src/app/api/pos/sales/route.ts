import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopId, customerName, items, paymentMethod, isSameCustomer, total, date } = body;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if pos_sales table exists, create if not
    const tableExists = await db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pos_sales'"
    );
    
    if (!tableExists) {
      console.log('Creating pos_sales table...');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS pos_sales (
          id TEXT PRIMARY KEY,
          shopId TEXT NOT NULL,
          transactionId TEXT UNIQUE NOT NULL,
          customerName TEXT,
          items TEXT NOT NULL,
          totalAmount REAL NOT NULL,
          discountAmount REAL DEFAULT 0,
          taxAmount REAL DEFAULT 0,
          finalAmount REAL NOT NULL,
          paymentMethod TEXT DEFAULT 'cash',
          isSameCustomer INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (shopId) REFERENCES shops(id)
        )
      `);
      console.log('pos_sales table created successfully');
    }
    
    // Generate unique transaction ID
    const transactionId = `TXN-${Date.now()}`;
    const saleId = generateUUID();

    // Calculate totals
    const totalAmount = total || items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const discountAmount = 0; // Can be added later
    const taxAmount = 0; // Can be added later
    const finalAmount = totalAmount - discountAmount + taxAmount;

    // Insert sale record
    await db.run(
      `INSERT INTO pos_sales (id, shopId, transactionId, customerName, items, totalAmount, discountAmount, taxAmount, finalAmount, paymentMethod, isSameCustomer, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saleId,
        shopId,
        transactionId,
        customerName || null,
        JSON.stringify(items),
        totalAmount,
        discountAmount,
        taxAmount,
        finalAmount,
        paymentMethod || 'cash',
        isSameCustomer ? 1 : 0,
        date || new Date().toISOString()
      ]
    );

    // Update shop inventory (reduce stock)
    for (const item of items) {
      if (item.productVariantId) {
        await db.run(
          `UPDATE shop_inventory 
           SET stock = MAX(0, stock - ?) 
           WHERE shopId = ? AND productVariantId = ?`,
          [item.quantity, shopId, item.productVariantId]
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      transactionId,
      saleId,
      totalAmount,
      finalAmount
    });
  } catch (error) {
    console.error('Error creating POS sale:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      error: 'Failed to create sale', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    const sales = await db.all(
      `SELECT * FROM pos_sales 
       WHERE shopId = ? 
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
      [shopId, parseInt(limit), parseInt(offset)]
    );

    const total = await db.get(
      `SELECT COUNT(*) as count FROM pos_sales WHERE shopId = ?`,
      [shopId]
    );

    return NextResponse.json({ 
      sales: sales.map((sale: any) => ({
        ...sale,
        items: JSON.parse(sale.items)
      })),
      total: total?.count || 0
    });
  } catch (error) {
    console.error('Error fetching POS sales:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}