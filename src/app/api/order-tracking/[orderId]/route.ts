import { NextRequest, NextResponse } from 'next/server';
import { getEcommerceOrderById } from '@/lib/customers-sqlite';
import { getDriverAssignmentById } from '@/lib/drivers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/order-tracking/[orderId] - Get order tracking information
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { orderId } = params;
    
    // Get order details
    const order = await getEcommerceOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check if customer can access this order
    if (authResult.role === 'customer') {
      if (order.customerId !== authResult.id.toString()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get driver assignment if exists
    let driverAssignment = null;
    let driverInfo = null;
    
    try {
      // Look for assignment by order ID
      const db = await getDB();
      const assignmentRecord = await db.get(`
        SELECT * FROM driver_assignments WHERE orderId = ?
      `, [orderId]);
      
      if (assignmentRecord) {
        driverAssignment = {
          id: assignmentRecord.id,
          driverId: assignmentRecord.driverId,
          status: assignmentRecord.status,
          pickupLocation: assignmentRecord.pickupLat && assignmentRecord.pickupLng ? {
            lat: assignmentRecord.pickupLat,
            lng: assignmentRecord.pickupLng,
            name: assignmentRecord.pickupName
          } : undefined,
          deliveryLocation: assignmentRecord.deliveryLat && assignmentRecord.deliveryLng ? {
            lat: assignmentRecord.deliveryLat,
            lng: assignmentRecord.deliveryLng,
            name: assignmentRecord.deliveryName
          } : undefined,
          estimatedDeliveryTime: assignmentRecord.estimatedDeliveryTime ? new Date(assignmentRecord.estimatedDeliveryTime) : undefined,
          actualPickupTime: assignmentRecord.actualPickupTime ? new Date(assignmentRecord.actualPickupTime) : undefined,
          actualDeliveryTime: assignmentRecord.actualDeliveryTime ? new Date(assignmentRecord.actualDeliveryTime) : undefined
        };
        
        // Get driver info
        const driverRecord = await db.get(`
          SELECT id, name, phone, vehicleType, currentLat, currentLng, locationLastUpdated, status
          FROM drivers WHERE id = ?
        `, [assignmentRecord.driverId]);
        
        if (driverRecord) {
          driverInfo = {
            id: driverRecord.id,
            name: driverRecord.name,
            phone: driverRecord.phone,
            vehicleType: driverRecord.vehicleType,
            currentLocation: driverRecord.currentLat && driverRecord.currentLng ? {
              lat: driverRecord.currentLat,
              lng: driverRecord.currentLng,
              lastUpdated: new Date(driverRecord.locationLastUpdated)
            } : undefined,
            status: driverRecord.status
          };
        }
      }
    } catch (error) {
      console.warn('Could not fetch driver assignment:', error);
    }
    
    // Prepare tracking response
    const trackingInfo = {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber,
      dispatchDate: order.dispatchDate,
      deliveryAddress: order.deliveryAddress,
      city: order.city,
      driverAssignment,
      driverInfo,
      orderItems: order.orderItems,
      totalAmount: order.totalAmount,
      transportationCost: order.transportationCost,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
    
    return NextResponse.json({ trackingInfo });
  } catch (error) {
    console.error('API Order Tracking GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Helper function to get DB (since it's not exported from customers-sqlite)
async function getDB() {
  const { getDB } = await import('@/lib/db');
  return getDB();
}