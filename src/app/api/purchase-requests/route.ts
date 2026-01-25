
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
    
    const data = await request.json();
    if (!data.materialId && !data.materialName) {
      return NextResponse.json({ error: 'Material name or ID is required' }, { status: 400 });
    }
    
    // If it's a new material request, we might need to handle it differently 
    // but for now, we'll store it in the purchase_requests table.
    // Note: The purchase_requests table expects a materialId. 
    // If it's a "New" material, we might need a placeholder or a new column.
    // Let's check the schema again.
    
    const id = await createPurchaseRequest({
      materialId: data.materialId || 'NEW', // Placeholder for new materials
      quantity: data.quantity || 0,
      reason: data.reason || `Direct request from Designer for Style BOM. ${data.materialName ? `Requested Material: ${data.materialName}` : ''}`,
      requesterId: user.id.toString()
    });
    
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating purchase request:', error);
    return NextResponse.json({ error: 'Failed to create purchase request' }, { status: 500 });
  }
}
