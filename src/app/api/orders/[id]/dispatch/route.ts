import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getOrderByIdFromDB } from '@/lib/orders';
import { createNotification } from '@/lib/notifications';
import { sendShopOrderNotification } from '@/lib/telegram-shop-notifications';
import { generateOrderDispatchPDF } from '@/lib/shop-order-telegram-pdf';

export const PUT = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  const { status } = await request.json();

  if (status !== 'Dispatched') {
    return NextResponse.json({ error: 'Invalid status for dispatch' }, { status: 400 });
  }

  // Get the order to verify current status and get details for notification
  const order = await getOrderByIdFromDB(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'Paid' && order.status !== 'Released') {
    return NextResponse.json({ error: 'Order must be Paid or Released before dispatching' }, { status: 400 });
  }

  const db = await getDb();
  
  // Update the order status to 'Dispatched'
  await db.run(`
    UPDATE orders 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, ['Dispatched', orderId]);

  // Update actualDispatchDate
  const dispatchDate = new Date().toISOString();
  await db.run(`
     UPDATE orders
     SET actualDispatchDate = ?
     WHERE id = ?
  `, [dispatchDate, orderId]);

  // NEW: Update Inventory - Reduce from Factory, Add to Shop
  try {
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    
    // Validate all items first to ensure we don't end up with partial updates
    for (const item of orderItems) {
      const quantity = Math.floor(Math.max(0, Number(item.quantity || 0)));
      if (quantity <= 0) continue; // Skip items with 0 quantity

      const variant = await db.get(`SELECT stock, color, size FROM product_variants WHERE id = ?`, [item.variant.id]);
      if (!variant) {
        throw new Error(`Variant ${item.variant.id} not found`);
      }
      if (variant.stock < quantity) {
        throw new Error(`Insufficient factory stock for ${item.name} (${variant.color}, ${variant.size}). Available: ${variant.stock}, Requested: ${quantity}`);
      }
    }

    for (const item of orderItems) {
      const variantId = item.variant.id;
      const quantity = Math.floor(Math.max(0, Number(item.quantity || 0)));
      if (quantity <= 0) continue;
      
      // 1. Reduce from Factory Inventory (Already validated above, but we use MAX to be safe)
      await db.run(`
        UPDATE product_variants 
        SET stock = MAX(0, stock - ?) 
        WHERE id = ?
      `, [quantity, variantId]);
      
      // 2. Add to Shop Inventory
      // Check if item already exists in shop inventory
      const shopItem = await db.get(`
        SELECT id, stock FROM shop_inventory 
        WHERE shopId = ? AND productVariantId = ?
      `, [order.shopId, variantId]);
      
      if (shopItem) {
        // Update existing shop inventory
        await db.run(`
          UPDATE shop_inventory 
          SET stock = stock + ? 
          WHERE id = ?
        `, [quantity, shopItem.id]);
      } else {
        // Insert new shop inventory record
        await db.run(`
          INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock, imageUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?, MAX(0, ?), ?)
        `, [
          order.shopId,
          item.productId,
          variantId,
          item.name,
          Math.max(0, Number(item.price || 0)),
          item.variant.color,
          item.variant.size,
          quantity,
          item.imageUrl || item.variant.imageUrl || null
        ]);
      }
    }
    console.log(`Inventory updated for order ${orderId}: Factory stock reduced, Shop ${order.shopId} inventory increased.`);
  } catch (inventoryError: any) {
    console.error('Failed to update inventory during dispatch:', inventoryError);
    return NextResponse.json({ 
      error: 'Inventory update failed', 
      details: inventoryError.message 
    }, { status: 400 });
  }

  // Create notification for the shop user about dispatch
  try {
    if (order.shopId) {
        await createNotification({
            userType: 'shop',
            shopId: order.shopId,
            title: 'Order Dispatched',
            description: `Your order #${orderId} has been dispatched and is on its way. Inventory has been updated in your shop.`,
            href: `/shop/orders/${orderId}`
        });
    }
  } catch (err) {
      console.error('Failed to notify shop:', err);
  }

  // Create notification for factory
  try {
    await createNotification({
        userType: 'factory',
        title: 'Order Dispatched',
        description: `Order #${orderId} has been dispatched by store user ${user.username}.`,
        href: `/orders/${orderId}` // Or orders list
    });
  } catch (err) {
      console.error('Failed to notify factory:', err);
  }

  // NEW: Telegram Notification for Shop Channel
  try {
    // Generate Dispatch Details PDF
    const { pdfPath, summary } = await generateOrderDispatchPDF(orderId);
    
    await sendShopOrderNotification(
      orderId,
      order.shopId,
      'order_dispatched',
      {
        pdfPath,
        caption: `📊 *Order Summary:*\n• Total Unique Styles: ${summary.uniqueStyles}\n• Total Quantity: ${summary.totalQuantity} pieces\n• Total Value: ${summary.totalValue.toLocaleString()} Birr\n\n🚚 Dispatched by: Store\nStatus: In transit to your shop`
      }
    );
    console.log('Shop Telegram notification sent for dispatch:', orderId);
  } catch (telegramError) {
    console.error('Failed to send Shop Telegram notification for dispatch:', telegramError);
  }

  return NextResponse.json({ message: 'Order dispatched successfully', order: { ...order, status: 'Dispatched' } });

}, 'store'); // Only store users can access this route