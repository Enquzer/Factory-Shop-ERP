import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { 
  getAllEcommerceOrders,
  updateEcommerceOrder,
  getEcommerceOrdersByShop,
  getShopEcommerceAnalytics,
  getOverallEcommerceAnalytics,
  reduceShopInventory
} from '@/lib/ecommerce-manager';
import { getEcommerceOrderById } from '@/lib/customers-sqlite';
import { createNotification } from '@/lib/notifications';

// GET /api/ecommerce-manager/orders - Get all eCommerce orders
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin' && authResult.role !== 'factory')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    
    const status = searchParams.get('status');
    
    let orders;
    if (status) {
       // Filter by status if provided (comma separated)
       const statuses = status.split(',');
       const allOrders = await getAllEcommerceOrders();
       orders = allOrders.filter((o: any) => statuses.includes(o.status));
    } else if (shopId) {
      orders = await getEcommerceOrdersByShop(shopId);
    } else {
      orders = await getAllEcommerceOrders();
    }
    
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching ecommerce orders:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/ecommerce-manager/orders - Update order details
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'ecommerce' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      orderId, 
      status, 
      transportationCost, 
      dispatchedFromShopId, 
      dispatchDate,
      trackingNumber,
      paymentStatus 
    } = body;
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (transportationCost !== undefined) updateData.transportationCost = transportationCost;
    if (dispatchedFromShopId) updateData.dispatchedFromShopId = dispatchedFromShopId;
    if (dispatchDate) updateData.dispatchDate = new Date(dispatchDate);
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    
    const success = await updateEcommerceOrder(orderId, updateData);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
    
    // If order is being dispatched, reduce shop inventory
    if (status === 'shipped' && dispatchedFromShopId) {
      const order = await getEcommerceOrderById(orderId);
      if (order) {
        await reduceShopInventory(dispatchedFromShopId, order.orderItems);
      }
    }
    
    // Create notification for customer (future enhancement)
    if (status === 'shipped' && trackingNumber) {
      // TODO: Send email/SMS to customer with tracking number
      console.log(`Order ${orderId} shipped with tracking: ${trackingNumber}`);
    }
    
    return NextResponse.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating ecommerce order:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
