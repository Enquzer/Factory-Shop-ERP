import { NextRequest, NextResponse } from 'next/server';
import { getAllSupportTickets, updateSupportTicket } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult || (authResult.role !== 'admin' && authResult.role !== 'ecommerce')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const tickets = await getAllSupportTickets();
    
    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error('Manager Support API error:', error);
    return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult || (authResult.role !== 'admin' && authResult.role !== 'ecommerce')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { id, reply, status } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });
    }
    
    const success = await updateSupportTicket(id, {
      reply,
      status
    });
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Manager Support API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
