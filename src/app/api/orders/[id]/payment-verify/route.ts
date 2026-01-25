import { NextRequest } from 'next/server';
import { withAuth, withRoleAuth } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendShopOrderNotification } from '@/lib/telegram-shop-notifications';
import { generateOrderTelegramPDF } from '@/lib/shop-order-telegram-pdf';

// PUT /api/orders/[id]/payment-verify - Verify payment for an order by finance user
export const PUT = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const orderId = params.id;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { status, actionBy } = await request.json();

    if (!status) {
      return new Response(
        JSON.stringify({ error: 'Status is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Connect to database
    const db = await getDb();

    // Get the current order
    const order = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, [orderId]);

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify that the status transition is valid
    if (order.status !== 'Awaiting Payment' && order.status !== 'Pending' && order.status !== 'Payment Slip Attached') {
      return new Response(
        JSON.stringify({ error: `Order cannot be verified for payment at '${order.status}' stage` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // CHECK: Payment slip must be attached
    if (!order.paymentSlipUrl) {
      return new Response(
        JSON.stringify({ error: 'Cannot verify payment: No payment slip has been attached to this order.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the order status to 'Paid'
    await db.run(`
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ['Paid', orderId]);

    // Create notification for factory user about verified payment
    await createNotification({
      userType: 'factory',
      title: 'Payment Verified by Finance',
      description: `Order #${orderId} payment has been verified by finance user ${user.username}. Ready for dispatch.`,
      href: `/orders/${orderId}`
    });

    // Create notification for shop user about payment verification
    await createNotification({
      userType: 'shop',
      shopId: order.shopId,
      title: 'Payment Verified',
      description: `Your order #${orderId} payment has been verified by finance and is now ready for dispatch.`,
      href: `/shop/orders/${orderId}`
    });

    // NEW: Telegram Notification for Shop Channel
    try {
      // Generate Updated PDF with Payment Info (Verified status)
      const { pdfPath, summary } = await generateOrderTelegramPDF(orderId, 'payment_verified');
      
      await sendShopOrderNotification(
        orderId as string,
        order.shopId,
        'payment_verified',
        {
          pdfPath,
          caption: `📊 *Order Summary:*\n• Total Unique Styles: ${summary.uniqueStyles}\n• Total Quantity: ${summary.totalQuantity} pieces\n• Total Value: ${summary.totalValue.toLocaleString()} Birr\n\n✅ Verified by: Finance\nStatus: Ready for Dispatch`
        }
      );
    } catch (telegramError) {
      console.error('Failed to send Shop Telegram notification for payment verification:', telegramError);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified successfully',
        orderId: orderId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}, 'finance');