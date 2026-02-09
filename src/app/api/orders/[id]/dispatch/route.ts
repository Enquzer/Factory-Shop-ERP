import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getOrderByIdFromDB } from '@/lib/orders';
import { createNotification } from '@/lib/notifications';
import { sendShopOrderNotification } from '@/lib/telegram-shop-notifications';
import { generateOrderDispatchPDF } from '@/lib/shop-order-telegram-pdf';
import { padNumberGenerator } from '@/lib/pad-number-generator';

export const PUT = withRoleAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  const { status, dispatchInfo } = await request.json();

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

  // Use provided pad number or generate one if not provided
  let finalPadNumber = dispatchInfo?.padNumber;
  let finalPadSequence = null;

  if (!finalPadNumber) {
    // Generate pad number for finished goods dispatch if not provided by user
    const padResult = await padNumberGenerator.generateNext('finished', order.shopId);
    finalPadNumber = padResult.number;
    finalPadSequence = padResult.sequence;
  }

  const db = await getDb();
  
  // Update the order status to 'Dispatched' and add dispatch info
  await db.run(`
    UPDATE orders 
    SET status = ?, 
        updated_at = CURRENT_TIMESTAMP,
        padNumber = ?, 
        padSequence = ?, 
        padPrefix = 'FG', 
        padFormat = 'PREFIX-SHOPID-SEQUENCE',
        dispatchInfo = ?,
        actualDispatchDate = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    'Dispatched', 
    finalPadNumber, 
    finalPadSequence, 
    JSON.stringify(dispatchInfo || {}),
    orderId
  ]);

  // NEW: Create Driver Assignment if a driver is selected
  if (dispatchInfo?.driverId) {
    try {
      const { assignOrderToDriver } = await import('@/lib/drivers-sqlite');
      
      // Get shop info for pickup/delivery locations
      const shop = await db.get(`SELECT exactLocation, city FROM shops WHERE id = ?`, [order.shopId]);
      
      // Pickup is factory, Delivery is shop
      const pickupLocation = { lat: 9.0333, lng: 38.7500, name: "Factory Warehouse" }; // Defaults or factory loc
      const deliveryLocation = { 
        lat: 9.0300, 
        lng: 38.7400, 
        name: shop?.exactLocation || `Shop ${order.shopId}` 
      };
      
      await assignOrderToDriver(
        dispatchInfo.driverId,
        orderId,
        user.username,
        pickupLocation,
        deliveryLocation
      );
      console.log(`[DISPATCH] Driver assignment created for driver ${dispatchInfo.driverId} and order ${orderId}`);
    } catch (driverError) {
      console.error('[DISPATCH] Failed to assign driver:', driverError);
    }
  }

  // NEW: Update Inventory - Reduce from Factory, Add to Shop
  try {
    console.log(`[DISPATCH] Starting inventory update for order ${orderId}`);
    const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    console.log(`[DISPATCH] Processing ${orderItems.length} items`);
    
    // Validate all items first to ensure we don't end up with partial updates
    for (const item of orderItems) {
      const quantity = Math.floor(Math.max(0, Number(item.quantity || 0)));
      if (quantity <= 0) {
        console.log(`[DISPATCH] Skipping item ${item.name} - zero quantity`);
        continue;
      }

      const variant = await db.get(`SELECT stock, color, size FROM product_variants WHERE id = ?`, [item.variant.id]);
      if (!variant) {
        console.error(`[DISPATCH] Variant ${item.variant.id} not found`);
        throw new Error(`Variant ${item.variant.id} not found`);
      }
      console.log(`[DISPATCH] Variant ${item.variant.id} (${variant.color}, ${variant.size}) - Current stock: ${variant.stock}, Requested: ${quantity}`);
      if (variant.stock < quantity) {
        console.error(`[DISPATCH] Insufficient stock for ${item.name} (${variant.color}, ${variant.size})`);
        throw new Error(`Insufficient factory stock for ${item.name} (${variant.color}, ${variant.size}). Available: ${variant.stock}, Requested: ${quantity}`);
      }
    }

    console.log(`[DISPATCH] All items validated successfully. Proceeding with inventory update.`);

    for (const item of orderItems) {
      const variantId = item.variant.id;
      const quantity = Math.floor(Math.max(0, Number(item.quantity || 0)));
      if (quantity <= 0) continue;
      
      // 1. Reduce from Factory Inventory (Already validated above, but we use MAX to be safe)
      const factoryResult = await db.run(`
        UPDATE product_variants 
        SET stock = MAX(0, stock - ?) 
        WHERE id = ?
      `, [quantity, variantId]);
      
      console.log(`[DISPATCH] Reduced factory stock for variant ${variantId} by ${quantity}. Changes: ${factoryResult.changes}`);
      
      // 2. Add to Shop Inventory
      // Check if item already exists in shop inventory
      const shopItem = await db.get(`
        SELECT id, stock FROM shop_inventory 
        WHERE shopId = ? AND productVariantId = ?
      `, [order.shopId, variantId]);
      
      if (shopItem) {
        // Get the actual product code from the database to ensure it's set correctly
        const product = await db.get(`
          SELECT p.productCode 
          FROM product_variants pv 
          JOIN products p ON pv.productId = p.id 
          WHERE pv.id = ?
        `, [variantId]);

        const currentProductCode = product?.productCode || item.productCode || 'N/A';

        // Update existing shop inventory and ensure productCode is set
        const shopResult = await db.run(`
          UPDATE shop_inventory 
          SET stock = stock + ?,
              productCode = ?
          WHERE id = ?
        `, [quantity, currentProductCode, shopItem.id]);
        
        console.log(`[DISPATCH] Updated shop inventory for variant ${variantId}. Previous stock: ${shopItem.stock}, Added: ${quantity}. Changes: ${shopResult.changes}`);
      } else {
        // Get the actual product code from the database
        const product = await db.get(`
          SELECT p.productCode 
          FROM product_variants pv 
          JOIN products p ON pv.productId = p.id 
          WHERE pv.id = ?
        `, [variantId]);
        
        if (!product) {
          console.error(`[DISPATCH] Product not found for variant ${variantId}`);
          throw new Error(`Product not found for variant ${variantId}`);
        }
        
        // Insert new shop inventory record with actual product code
        await db.run(`
          INSERT INTO shop_inventory (shopId, productId, productCode, productVariantId, name, price, color, size, stock, imageUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, MAX(0, ?), ?)
        `, [
          order.shopId,
          item.productId,
          product.productCode,
          variantId,
          item.name,
          Math.max(0, Number(item.price || 0)),
          item.variant.color,
          item.variant.size,
          quantity,
          item.imageUrl || item.variant.imageUrl || null
        ]);
        
        console.log(`[DISPATCH] Created new shop inventory record for variant ${variantId} with stock: ${quantity}`);
      }
    }
    console.log(`[DISPATCH] ✅ Inventory updated successfully for order ${orderId}: Factory stock reduced, Shop ${order.shopId} inventory increased.`);
  } catch (inventoryError: any) {
    console.error('[DISPATCH] ❌ Failed to update inventory during dispatch:', inventoryError);
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
        caption: `📊 *Order Summary:*
• Total Unique Styles: ${summary.uniqueStyles}
• Total Quantity: ${summary.totalQuantity} pieces
• Total Value: ${summary.totalValue.toLocaleString()} Birr

🚚 Dispatched by: Store
Status: In transit to your shop`
      }
    );
    console.log('Shop Telegram notification sent for dispatch:', orderId);
  } catch (telegramError) {
    console.error('Failed to send Shop Telegram notification for dispatch:', telegramError);
  }

  return NextResponse.json({ message: 'Order dispatched successfully', order: { ...order, status: 'Dispatched' } });

}, 'store'); // Only store users can access this route