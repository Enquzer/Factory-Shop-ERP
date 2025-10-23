import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/orders/[id]/dispatch - Add dispatch information for an order
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { dispatchInfo } = await request.json();

    // Validate required fields
    if (!dispatchInfo || !dispatchInfo.shopName || !dispatchInfo.transportLicensePlate || 
        !dispatchInfo.contactPerson || !dispatchInfo.dispatchDate) {
      return NextResponse.json({ error: 'All required dispatch information fields are required' }, { status: 400 });
    }

    // Update order with dispatch information
    const db = await getDb();
    await db.run(`
      UPDATE orders 
      SET status = ?, 
          dispatchInfo = ?
      WHERE id = ?
    `, 'Dispatched', JSON.stringify(dispatchInfo), id);

    // Get the updated order
    const order = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, id);

    if (order) {
      // Create notification for the shop
      const shopNotification = {
        userType: 'shop' as 'shop',
        shopId: order.shopId,
        title: `Order Dispatched`,
        description: `Your order #${id} has been dispatched. Transport: ${dispatchInfo.transportLicensePlate}`,
        href: `/shop/orders`,
      };
      
      console.log('Creating shop notification:', shopNotification); // Debug log
      await createNotification(shopNotification);
      
      // Create notification for the factory
      const factoryNotification = {
        userType: 'factory' as 'factory',
        title: `Order Dispatched`,
        description: `Order #${id} for ${order.shopName} has been dispatched`,
        href: `/orders`,
      };
      
      console.log('Creating factory notification:', factoryNotification); // Debug log
      await createNotification(factoryNotification);
    }

    return NextResponse.json({ message: 'Dispatch information added successfully' });
  } catch (error) {
    console.error('Error adding dispatch information:', error);
    return NextResponse.json({ error: 'Failed to add dispatch information' }, { status: 500 });
  }
}