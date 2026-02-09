import { NextRequest, NextResponse } from 'next/server';
import { getEcommerceOrderById, updateEcommerceOrder } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow customers, admins, and factory users
    const allowedRoles = ['customer', 'admin', 'factory'];
    if (!allowedRoles.includes(authResult.role)) {
        return NextResponse.json({ error: 'Unauthorized role' }, { status: 401 });
    }
    
    const order = await getEcommerceOrderById(id);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Security check: ensure the order belongs to the requester, UNLESS requester is admin/factory
    const isOwner = order.customerId === authResult.username;
    const isStaff = authResult.role === 'admin' || authResult.role === 'factory';
    
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Fetch Order API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch order', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['customer', 'admin', 'factory'];
    if (!allowedRoles.includes(authResult.role)) {
        return NextResponse.json({ error: 'Unauthorized role' }, { status: 401 });
    }
    
    const order = await getEcommerceOrderById(id);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Security check
    const isOwner = order.customerId === authResult.username;
    const isStaff = authResult.role === 'admin' || authResult.role === 'factory';
    
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { customerName, customerPhone, deliveryAddress, city, status } = body;
    
    // Logic for customers confirming delivery
    if (authResult.role === 'customer' && status === 'delivered') {
      const allowedStatuses = ['shipped', 'picked_up', 'in_transit'];
      if (!allowedStatuses.includes(order.status)) {
        return NextResponse.json({ error: 'Order must be shipped, picked up, or in transit before confirming delivery' }, { status: 400 });
      }
      
      const success = await updateEcommerceOrder(id, { status: 'delivered' });
      if (success) {
        // Notify Ecommerce Manager
        await createNotification({
          userType: 'ecommerce',
          title: 'Order Delivered',
          description: `Order #${id.split('-').pop()} marked as delivered by customer.`,
          href: `/ecommerce-manager/orders?highlight=${id}`
        });
        return NextResponse.json({ success: true, message: 'Order marked as delivered' });
      } else {
        return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
      }
    }

    // Logic for customers cancelling orders
    if (authResult.role === 'customer' && status === 'cancelled') {
        const cancellableStates = ['pending', 'confirmed'];
        if (!cancellableStates.includes(order.status)) {
          return NextResponse.json({ error: 'Order cannot be cancelled at this stage' }, { status: 400 });
        }
        
        const { cancellationReason } = body;
        const success = await updateEcommerceOrder(id, { 
          status: 'cancelled',
          cancellationReason: cancellationReason || 'Cancelled by customer'
        });
        if (success) {
          // Notify Ecommerce Manager
          await createNotification({
            userType: 'ecommerce',
            title: 'Order Cancelled',
            description: `Order #${id.split('-').pop()} cancelled by customer. Reason: ${cancellationReason || 'Changed mind'}`,
            href: `/ecommerce-manager/orders?highlight=${id}`
          });
          return NextResponse.json({ success: true, message: 'Order cancelled' });
        } else {
          return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
        }
    }

    // Existing update logic for pending orders
    if (order.status !== 'pending' && authResult.role === 'customer') {
      return NextResponse.json({ error: 'Order cannot be updated once processed' }, { status: 400 });
    }

    const success = await updateEcommerceOrder(id, {
      customerName,
      customerPhone,
      deliveryAddress,
      city
    });
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
