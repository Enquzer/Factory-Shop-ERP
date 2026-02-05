
import { NextRequest, NextResponse } from 'next/server';
import { getAllRareProductRequests, updateRareProductRequestStatus } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    // Allow factory, marketing, admin, and ecommerce roles
    if (!authResult || (authResult.role !== 'factory' && authResult.role !== 'marketing' && authResult.role !== 'admin' && authResult.role !== 'ecommerce')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const requests = await getAllRareProductRequests();
    
    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Manager Requests API error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult || (authResult.role !== 'factory' && authResult.role !== 'marketing' && authResult.role !== 'admin' && authResult.role !== 'ecommerce')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const success = await updateRareProductRequestStatus(id, status);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Manager Requests API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
