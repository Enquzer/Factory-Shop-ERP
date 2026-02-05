import { NextRequest, NextResponse } from 'next/server';
import { clearCart } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || (authResult.role !== 'customer' && authResult.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const success = await clearCart(authResult.username);
    
    if (success) {
      return NextResponse.json({ message: 'Cart cleared' });
    } else {
      return NextResponse.json({ error: 'Failed to clear' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
