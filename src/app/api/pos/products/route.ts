import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopId, productCode, name, price, imageUrl } = body;

    if (!shopId || !productCode || !name || typeof price !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();

    // Check if product code already exists for this shop
    const existing = await db.get(
      `SELECT id FROM pos_products WHERE shopId = ? AND productCode = ?`,
      [shopId, productCode]
    );

    if (existing) {
      return NextResponse.json({ error: 'Product code already exists' }, { status: 400 });
    }

    // Insert new product
    const result = await db.run(
      `INSERT INTO pos_products (shopId, productCode, name, price, imageUrl)
       VALUES (?, ?, ?, ?, ?)`,
      [shopId, productCode, name, price, imageUrl || null]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating POS product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    let query = `SELECT * FROM pos_products WHERE shopId = ?`;
    const params: any[] = [shopId];

    if (activeOnly) {
      query += ` AND isActive = 1`;
    }

    query += ` ORDER BY createdAt DESC`;

    const products = await db.all(query, params);

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching POS products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, shopId, productCode, name, price, imageUrl, isActive } = body;

    if (!id || !shopId) {
      return NextResponse.json({ error: 'ID and Shop ID are required' }, { status: 400 });
    }

    const db = await getDb();

    // Update product
    const result = await db.run(
      `UPDATE pos_products 
       SET productCode = ?, name = ?, price = ?, imageUrl = ?, isActive = ?
       WHERE id = ? AND shopId = ?`,
      [productCode, name, price, imageUrl || null, isActive ? 1 : 0, id, shopId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Product not found or no changes made' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating POS product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shopId = searchParams.get('shopId');

    if (!id || !shopId) {
      return NextResponse.json({ error: 'ID and Shop ID are required' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.run(
      `DELETE FROM pos_products WHERE id = ? AND shopId = ?`,
      [id, shopId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting POS product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}