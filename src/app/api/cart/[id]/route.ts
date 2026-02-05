import { NextRequest, NextResponse } from 'next/server';
import { updateCartItemQuantity, removeCartItem } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'customer' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { quantity } = body;
    
    if (quantity === undefined || quantity < 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }
    
    const success = await updateCartItemQuantity(params.id, quantity);
    
    if (success) {
      return NextResponse.json({ message: 'Cart item updated' });
    } else {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'customer' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const success = await removeCartItem(params.id);
    
    if (success) {
      return NextResponse.json({ message: 'Item removed' });
    } else {
      return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
