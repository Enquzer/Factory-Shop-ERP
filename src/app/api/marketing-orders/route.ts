import { NextResponse } from 'next/server';
import { getMarketingOrdersFromDB, createMarketingOrderInDB, deleteMarketingOrderFromDB } from '@/lib/marketing-orders';
import { getDb } from '@/lib/db';
import { createProduct } from '@/lib/products-sqlite';

// GET /api/marketing-orders - Get all marketing orders
export async function GET() {
  try {
    console.log('GET /api/marketing-orders called');
    const orders = await getMarketingOrdersFromDB();
    console.log('Marketing orders fetched from database:', orders);
    
    const response = NextResponse.json(orders);
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    console.log('Marketing orders API response sent');
    return response;
  } catch (error) {
    console.error('Error fetching marketing orders:', error);
    return NextResponse.json({ error: 'Failed to fetch marketing orders' }, { status: 500 });
  }
}

// POST /api/marketing-orders - Create a new marketing order
export async function POST(request: Request) {
  try {
    const orderData = await request.json();
    
    // Generate order number if not provided
    let orderNumber = orderData.orderNumber;
    if (!orderNumber) {
      // Generate order number in format CM-YYYY-XXXX where XXXX is a sequential number
      const year = new Date().getFullYear();
      const db = await getDb();
      
      // Get the count of orders for this year to generate a sequential number
      const orderCountResult = await db.get(`
        SELECT COUNT(*) as count FROM marketing_orders 
        WHERE orderNumber LIKE ?
      `, `CM-${year}-%`);
      
      const orderCount = orderCountResult?.count || 0;
      const nextNumber = orderCount + 1;
      orderNumber = `CM-${year}-${nextNumber.toString().padStart(4, '0')}`;
    }
    
    // Validate required fields
    if (!orderData.productName || !orderData.productCode || !orderData.quantity || !orderData.items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create the marketing order
    const newOrder = await createMarketingOrderInDB({
      ...orderData,
      orderNumber
    });
    
    // If this is a new product, register it in the product database
    if (orderData.isNewProduct) {
      try {
        // Prepare product data for registration
        const productData = {
          productCode: orderData.productCode,
          name: orderData.productName,
          category: orderData.category || 'Unisex',
          price: orderData.price || 0,
          minimumStockLevel: 0,
          description: orderData.description || '',
          imageUrl: orderData.imageUrl || undefined, // Use uploaded image URL if provided
          variants: orderData.items.map((item: any) => ({
            id: `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            color: item.color,
            size: item.size,
            stock: 0, // Initially 0 stock as it's being produced
            imageUrl: undefined
          })),
          readyToDeliver: 0 // Not ready to deliver until marked as completed
        };
        
        // Create the product in the database
        const db = await getDb();
        const productId = `PRD-${Date.now()}`;
        
        await db.run(`
          INSERT INTO products (id, productCode, name, category, price, minimumStockLevel, description, imageUrl, readyToDeliver, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, productId, productData.productCode, productData.name, productData.category, productData.price, productData.minimumStockLevel, productData.description, productData.imageUrl, productData.readyToDeliver);
        
        // Insert the variants
        for (const variant of productData.variants) {
          await db.run(`
            INSERT INTO product_variants (id, productId, color, size, stock)
            VALUES (?, ?, ?, ?, ?)
          `, variant.id, productId, variant.color, variant.size, variant.stock);
        }
        
        console.log('New product registered:', productData.productCode);
      } catch (productError) {
        console.error('Error registering new product:', productError);
        // Don't fail the order creation if product registration fails
      }
    }
    
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    console.error('Error creating marketing order:', error);
    return NextResponse.json({ error: 'Failed to create marketing order', details: error.message }, { status: 500 });
  }
}

// DELETE /api/marketing-orders/:id - Delete a marketing order
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteMarketingOrderFromDB(params.id);
    
    if (success) {
      return NextResponse.json({ message: 'Marketing order deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete marketing order' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting marketing order:', error);
    return NextResponse.json({ error: 'Failed to delete marketing order' }, { status: 500 });
  }
}