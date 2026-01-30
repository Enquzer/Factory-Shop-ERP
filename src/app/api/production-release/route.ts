import { NextResponse, NextRequest } from 'next/server';
import { updateMarketingOrderInDB, getMarketingOrderByIdFromDB } from '@/lib/marketing-orders';
import { createNotification } from '@/lib/notifications';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user || (user.role !== 'planning' && user.role !== 'factory' && user.role !== 'marketing')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, updates } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Fetch order to get details for notifications
    const order = await getMarketingOrderByIdFromDB(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // --- ENFORCE MATERIAL FULFILLMENT LOGIC ---
    if (!order.isMaterialsConfirmed) {
      return NextResponse.json({ 
        error: 'Incomplete Material Fulfillment', 
        details: 'You cannot release this order to production until raw materials availability is confirmed in the Fulfillment Center.' 
      }, { status: 400 });
    }

    // Apply updates (status, dates, etc.)
    const success = await updateMarketingOrderInDB(orderId, {
      ...updates,
      status: 'Cutting', // Default next status
      isPlanningApproved: 1 // release order is approval
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // --- NEW: Generate Material Requisitions based on BOM ---
    try {
        const { generateMaterialRequisitionsForOrder } = await import('@/lib/bom');
        const { getDb } = await import('@/lib/db');
        const db = await getDb();
        
        // Find the product ID associated with this productCode
        const product = await db.get('SELECT id FROM products WHERE productCode = ?', [order.productCode]);
        
        if (product) {
            await generateMaterialRequisitionsForOrder(order.id, order.quantity, product.id);
            console.log(`Generated requisitions for order ${order.orderNumber}`);
        } else {
            console.warn(`Could not find product for code ${order.productCode} to generate BOM requisitions`);
        }
    } catch (bomError) {
        console.error('Error generating BOM requisitions:', bomError);
        // We don't fail the whole release if BOM generation fails, but we log it
    }

    // Check if new product to mention sample info
    const sampleInfo = order.isNewProduct ? " This is a NEW PRODUCT - Please check sample approvals." : "";

    // Send Notifications
    const notifications = [
      {
        userType: 'cutting' as const,
        title: 'New Order Released for Cutting',
        description: `Order ${order.orderNumber} (${order.productCode}) is ready. Size/Color breakdown available. ${sampleInfo}`,
        href: '/cutting'
      },
      {
        userType: 'sewing' as const,
        title: 'New Order Scheduled for Sewing',
        description: `Order ${order.orderNumber} scheduled. OB and Dates available.`,
        href: '/sewing'
      },
      {
        userType: 'packing' as const,
        title: 'New Order Scheduled for Packing',
        description: `Order ${order.orderNumber} scheduled. Packing dates available.`,
        href: '/packing'
      },
      {
        userType: 'quality_inspection' as const,
        title: 'New Order Released',
        description: `Order ${order.orderNumber} (${order.productCode}) has been released for production.`,
        href: '/quality-dashboard'
      }
    ];

    await Promise.all(notifications.map(n => createNotification(n)));

    return NextResponse.json({ message: 'Order released and notifications sent' });

  } catch (error: any) {
    console.error('Error releasing order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
