import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { assignOrderToDriver } from '@/lib/drivers-sqlite';
import { getEcommerceOrderById } from '@/lib/customers-sqlite';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get order details
    const order = await getEcommerceOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get available drivers
    const db = await getDB();
    const availableDrivers = await db.all(`
      SELECT id, name, currentLat, currentLng, vehicleType 
      FROM drivers 
      WHERE status = 'available' 
      ORDER BY RANDOM() 
      LIMIT 5
    `);

    if (availableDrivers.length === 0) {
      return NextResponse.json({ 
        error: 'No available drivers found' 
      }, { status: 404 });
    }

    // Select the closest available driver (simplified logic)
    const selectedDriver = availableDrivers[0];

    // Get shop location (assuming default shop for now)
    const shop = await db.get(`
      SELECT latitude as lat, longitude as lng, name 
      FROM shops 
      WHERE id = ?
    `, [order.dispatchedFromShopId || 1]);

    if (!shop) {
      return NextResponse.json({ 
        error: 'Shop location not found' 
      }, { status: 404 });
    }

    // Create driver assignment
    const assignmentId = await assignOrderToDriver(
      selectedDriver.id,
      orderId,
      'ecommerce_manager',
      { lat: shop.lat, lng: shop.lng, name: shop.name },
      { lat: order.latitude || 9.002542, lng: order.longitude || 38.779758, name: order.city || 'Addis Ababa' }
    );

    // Update driver status to assigned
    await db.run(`
      UPDATE drivers 
      SET status = 'assigned' 
      WHERE id = ?
    `, [selectedDriver.id]);

    // Update order status to in_transit automatically
    await db.run(`
      UPDATE ecommerce_orders 
      SET status = 'in_transit', updatedAt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [orderId]);

    // Trigger automatic status update notification
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}/auto-in-transit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
    } catch (notificationError) {
      console.log('Failed to send in-transit notification:', notificationError);
    }

    return NextResponse.json({ 
      success: true,
      assignmentId,
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      message: 'Driver assigned successfully and order status updated to in_transit'
    });

  } catch (error) {
    console.error('Auto-assignment error:', error);
    return NextResponse.json({ 
      error: 'Failed to assign driver automatically' 
    }, { status: 500 });
  }
}