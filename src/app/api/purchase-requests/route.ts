
import { NextResponse, NextRequest } from 'next/server';
import { createPurchaseRequest, getPurchaseRequests } from '@/lib/raw-materials';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const requests = await getPurchaseRequests();
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchase requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow store, factory, and planning users to create purchase requests
    if (user.role !== 'store' && user.role !== 'factory' && user.role !== 'planning') {
      return NextResponse.json({ 
        error: `Unauthorized: Store, Factory, or Planning access required. Your role: ${user.role}` 
      }, { status: 403 });
    }
    
    const data = await request.json();
    if (!data.materialId && !data.materialName) {
      return NextResponse.json({ error: 'Material name or ID is required' }, { status: 400 });
    }
    
    // Log the request for debugging
    console.log(`Purchase request created by ${user.username} (${user.role}):`, data);
    
    const id = await createPurchaseRequest({
      materialId: data.materialId || 'NEW', // Placeholder for new materials
      quantity: data.quantity || 0,
      reason: data.reason || `Request from ${user.role} user ${user.username}. ${data.materialName ? `Requested Material: ${data.materialName}` : ''}`,
      requesterId: user.id.toString(),
      orderId: data.orderId,
      requisitionId: data.requisitionId
    });
    
    console.log(`Purchase request created with ID: ${id}`);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating purchase request:', error);
    return NextResponse.json({ error: 'Failed to create purchase request' }, { status: 500 });
  }
}
