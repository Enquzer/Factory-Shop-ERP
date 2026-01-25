import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { authenticateRequest } from '@/lib/auth-middleware';

// PUT /api/orders/[id]/payment - Confirm payment for an order
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    // @ts-ignore
    const user = await authenticateRequest(request as any);
    
    // Only shop users can upload payment slips
    if (!user || user.role !== 'shop') {
      return NextResponse.json({ error: 'Unauthorized. Only shop users can upload payment slips.' }, { status: 403 });
    }

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
    `, 'Payment Slip Attached', paymentSlipUrl, id);

    // Get the updated order
    const order = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, id);

    if (order) {
      // Create notification for the factory
      try {
        await createNotification({
          userType: 'factory',
          title: `Payment Updates`,
          description: `Payment slip uploaded for order #${id} from ${order.shopName}`,
          href: `/orders`,
        });
      } catch (err) {
        console.error('Failed to notify factory:', err);
      }

      // Create notification for finance
      try {
        await createNotification({
          userType: 'finance',
          title: `Payment Verification Needed`,
          description: `Payment slip uploaded for order #${id}. Please verify.`,
          href: `/finance/orders/${id}`,
        });
      } catch (err) {
         console.error('Failed to notify finance:', err);
      }

      // NEW: Telegram Notification for Shop Channel
      try {
        const { sendShopOrderNotification } = await import('@/lib/telegram-shop-notifications');
        const { generateOrderTelegramPDF } = await import('@/lib/shop-order-telegram-pdf');
        
        // Generate Updated PDF with Payment Info
        const { pdfPath, summary } = await generateOrderTelegramPDF(id, 'payment_verified');
        
        await sendShopOrderNotification(
          id,
          order.shopId,
          'payment_verified',
          {
            pdfPath,
            caption: `📊 *Order Summary:*\n• Total Unique Styles: ${summary.uniqueStyles}\n• Total Quantity: ${summary.totalQuantity} pieces\n• Total Value: ${summary.totalValue.toLocaleString()} Birr\n\n📄 Status: Payment Slip Attached\nAwaiting Verification by Finance`
          }
        );
      } catch (telegramError) {
        console.error('Failed to send Shop Telegram notification for payment:', telegramError);
      }
    }

    return NextResponse.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}