import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

// PUT /api/orders/[id]/payment - Confirm payment for an order
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { paymentSlipUrl } = await request.json();

    // Validate required fields
    if (!paymentSlipUrl) {
      return NextResponse.json({ error: 'Payment slip URL is required' }, { status: 400 });
    }

    // Update order with payment information
    const db = await getDb();
    await db.run(`
      UPDATE orders 
      SET status = ?, paymentSlipUrl = ?
      WHERE id = ?
    `, 'Paid', paymentSlipUrl, id);

    // Get the updated order
    const order = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, id);

    if (order) {
      // Create notification for the factory
      await createNotification({
        userType: 'factory',
        title: `Payment Confirmed`,
        description: `Payment for order #${id} from ${order.shopName} has been confirmed`,
        href: `/orders`,
      });
    }

    return NextResponse.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}