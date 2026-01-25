import { sendShopOrderNotification } from './src/lib/telegram-shop-notifications';
import { generateOrderTelegramPDF } from './src/lib/shop-order-telegram-pdf';
import { getDb } from './src/lib/db';

async function testManual() {
  try {
    const db = await getDb();
    const order = await db.get('SELECT id, shopId FROM orders ORDER BY created_at DESC LIMIT 1');
    if (!order) {
      console.log('No orders found to test');
      return;
    }
    
    const orderId = order.id;
    const shopId = order.shopId;
    
    console.log(`Testing with Order: ${orderId}, Shop: ${shopId}`);
    
    console.log('1. Generating PDF...');
    const pdfPath = await generateOrderTelegramPDF(orderId, 'order_placed');
    console.log('PDF Generated at:', pdfPath);
    
    console.log('2. Sending Notification...');
    const result = await sendShopOrderNotification(
      orderId,
      shopId,
      'order_placed',
      {
        pdfPath,
        caption: `📋 *Test Manual*\n\nOrder ID: \`${orderId}\``
      }
    );
    
    console.log('Result:', result);
  } catch (error) {
    console.error('CRASHED:', error);
  }
}

testManual();
