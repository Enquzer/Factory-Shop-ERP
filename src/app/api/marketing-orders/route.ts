import { NextResponse, NextRequest } from 'next/server';
import { getMarketingOrdersFromDB, createMarketingOrderInDB, deleteMarketingOrderFromDB, getDailyProductionStatus, updateDailyProductionStatus } from '@/lib/marketing-orders';
import { getDb } from '@/lib/db';
import { createProduct } from '@/lib/products-sqlite';
import { createNotification } from '@/lib/notifications';
import { authenticateRequest } from '@/lib/auth-middleware';

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

// POST /api/marketing-orders - Create a new marketing order or update daily status
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    
    // Check if this is a daily status update request
    if (url.pathname.endsWith('/daily-status')) {
      const statusData = await request.json();
      
      // Validate required fields
      if (!statusData.orderId || !statusData.date || !statusData.size || !statusData.color) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const success = await updateDailyProductionStatus(statusData);
      
      if (success) {
        return NextResponse.json({ message: 'Daily production status updated successfully' });
      } else {
        return NextResponse.json({ error: 'Failed to update daily production status' }, { status: 500 });
      }
    }
    
    // Default to creating a new marketing order - Restrict to factory/marketing
    if (user.role !== 'factory' && user.role !== 'marketing') {
      return NextResponse.json({ error: 'Forbidden: Only factory or marketing can create orders' }, { status: 403 });
    }
    
    const orderData = await request.json();
    
    // Validate required fields
    if (!orderData.productName || !orderData.productCode || !orderData.quantity || !orderData.items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create the marketing order (order number will be generated if not provided)
    const newOrder = await createMarketingOrderInDB({
      ...orderData,
      orderNumber: orderData.orderNumber,
      orderPlacementDate: orderData.orderPlacementDate
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
    
    // Notify planning team
    try {
      await createNotification({
        userType: 'planning',
        title: 'New Marketing Order Placed',
        description: `New order ${newOrder.orderNumber} for ${newOrder.productName} has been placed.`,
        href: `/order-planning`,
      });
    } catch (notificationError) {
      console.error('Failed to create planning notification:', notificationError);
    }
    
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    console.error('Error creating marketing order:', error);
    return NextResponse.json({ error: 'Failed to create marketing order', details: error.message }, { status: 500 });
  }
}