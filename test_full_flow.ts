import { getDb } from './src/lib/db';
import { sendShopOrderNotification } from './src/lib/telegram-shop-notifications';
import { generateOrderTelegramPDF } from './src/lib/shop-order-telegram-pdf';

async function testFullFlow() {
  try {
    console.log('=== FULL TELEGRAM NOTIFICATION TEST ===\n');
    
    const db = await getDb();
    
    // Get the Mexico Shop details
    const shop = await db.get('SELECT id, name, telegram_channel_id FROM shops WHERE name = ?', 'Mexico Shop');
    console.log('Shop Details:', JSON.stringify(shop, null, 2));
    
    if (!shop) {
      console.error('Mexico Shop not found!');
      return;
    }
    
    if (!shop.telegram_channel_id) {
      console.error('Shop does not have Telegram channel configured!');
      return;
    }
    
    // Get the most recent order for this shop
    const order = await db.get('SELECT id, shopId, status FROM orders WHERE shopId = ? ORDER BY created_at DESC LIMIT 1', shop.id);
    console.log('\nMost Recent Order:', JSON.stringify(order, null, 2));
    
    if (!order) {
      console.error('No orders found for this shop!');
      return;
    }
    
    console.log('\n--- Step 1: Generating PDF ---');
    const result = await generateOrderTelegramPDF(order.id, 'order_placed');
    console.log('PDF Path:', result.pdfPath);
    console.log('Summary:', result.summary);
    
    console.log('\n--- Step 2: Sending Telegram Notification ---');
    const notificationResult = await sendShopOrderNotification(
      order.id,
      shop.id,
      'order_placed',
      {
        pdfPath: result.pdfPath,
        caption: `📋 *Test Order Notification*\n\nOrder ID: \`${order.id}\`\nShop: ${shop.name}\n\n📊 *Order Summary:*\n• Total Unique Styles: ${result.summary.uniqueStyles}\n• Total Quantity: ${result.summary.totalQuantity} pieces\n• Total Value: ${result.summary.totalValue.toLocaleString()} Birr`
      }
    );
    
    console.log('\n--- Result ---');
    console.log('Notification sent:', notificationResult);
    
    // Check the logs
    console.log('\n--- Step 3: Checking Notification Logs ---');
    const logs = await db.all('SELECT * FROM shop_telegram_notifications ORDER BY created_at DESC LIMIT 3');
    console.log('Recent Logs:', JSON.stringify(logs, null, 2));
    
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error);
  }
}

testFullFlow();
