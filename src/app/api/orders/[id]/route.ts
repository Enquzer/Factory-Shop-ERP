import { NextResponse } from 'next/server';
import { deleteOrderFromDB } from '@/lib/orders';

// DELETE /api/orders/:id - Delete an order
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    const success = await deleteOrderFromDB(id);
    
    if (success) {
      return NextResponse.json({ message: 'Order deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}