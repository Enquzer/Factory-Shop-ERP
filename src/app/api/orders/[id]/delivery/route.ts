import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { addItemsToShopInventory, getShopInventoryItem, updateShopInventoryItemStock } from '@/lib/shop-inventory-sqlite';
import { updateVariantStock } from '@/lib/products-sqlite';
import { createNotification } from '@/lib/notifications';

// PUT /api/orders/[id]/delivery - Confirm delivery for an order
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  let db;
  try {
    const { id } = params;
    const { deliveryDate, isClosed, feedback } = await request.json();

    // Validate required fields
    if (!deliveryDate) {
      return NextResponse.json({ error: 'Delivery date is required' }, { status: 400 });
    }

    // Get the current order before updating
    db = await getDb();
    const currentOrder = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, id);

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update order with delivery information and confirmation date
    const confirmationDate = new Date().toISOString().split('T')[0];
    
    if (isClosed) {
      // If order is closed, update status to Delivered
      await db.run(`
        UPDATE orders 
        SET status = ?, 
            deliveryDate = ?,
            isClosed = ?,
            feedback = ?,
            confirmationDate = ?
        WHERE id = ?
      `, 'Delivered', deliveryDate, isClosed, feedback || null, confirmationDate, id);
    } else {
      // If order is not closed, just update delivery date and confirmation date
      await db.run(`
        UPDATE orders 
        SET deliveryDate = ?,
            feedback = ?,
            confirmationDate = ?
        WHERE id = ?
      `, deliveryDate, feedback || null, confirmationDate, id);
    }

    // Get the updated order
    const order = await db.get(`
      SELECT * FROM orders WHERE id = ?
    `, id);

    if (order) {
      // 2. Handle Handover to Shop (Inventory Update)
      // IMPORTANT: If the order was already 'Dispatched', inventory has already been 
      // subtracted from factory and added to shop in the dispatch API.
      // We only update inventory here if the order is being closed directly from a non-dispatched state.
      if (isClosed && currentOrder.status !== 'Delivered' && currentOrder.status !== 'Dispatched') {
        try {
          // Begin transaction for inventory updates
          await db.run('BEGIN TRANSACTION');
          
          // Parse order items
          const orderItems = JSON.parse(order.items);
          
          // Reduce factory stock for each item
          for (const item of orderItems) {
            // First, get the current stock for the variant
            const variant = await db.get(`
              SELECT stock FROM product_variants WHERE id = ?
            `, item.variant.id);
            
            if (variant) {
              // Reduce the factory stock by the ordered quantity
              const newStock = variant.stock - item.quantity;
              const result = await db.run(`
                UPDATE product_variants SET stock = ? WHERE id = ?
              `, newStock, item.variant.id);
              
              if ((result.changes || 0) === 0) {
                throw new Error(`Failed to update factory stock for variant ${item.variant.id}`);
              }
              
              // Check if stock is at or below minimum level and create notification
              const product = await db.get(`
                SELECT p.minimumStockLevel, p.name, pv.color, pv.size
                FROM products p
                JOIN product_variants pv ON p.id = pv.productId
                WHERE pv.id = ?
              `, item.variant.id);
              
              if (product && newStock <= product.minimumStockLevel) {
                // Create low stock notification for factory
                await createNotification({
                  userType: 'factory',
                  title: `Low Stock Alert`,
                  description: `Product "${product.name}" (${product.color}, ${product.size}) stock is at ${newStock}, which is at or below the minimum level of ${product.minimumStockLevel}.`,
                  href: `/products`,
                });
              }
            }
          }
          
          // Transform OrderItem to ShopInventoryItem and add/update shop inventory
          for (const item of orderItems) {
            const variantId = item.variant.id;
            
            // Get the actual product code from the database to ensure accuracy
            const product = await db.get(`
              SELECT p.productCode 
              FROM product_variants pv 
              JOIN products p ON pv.productId = p.id 
              WHERE pv.id = ?
            `, [variantId]);
            
            if (!product) {
              console.warn(`Product not found for variant ${variantId}, using item name as fallback for product code`);
            }
            
            const currentProductCode = product?.productCode || item.productCode || 'N/A';

            // Check if item already exists in shop inventory
            const existingItem = await db.get(`
              SELECT id FROM shop_inventory 
              WHERE shopId = ? AND productVariantId = ?
            `, order.shopId, variantId);
            
            if (existingItem) {
              // If item exists, update its stock and ensure productCode is set
              const result = await db.run(`
                UPDATE shop_inventory 
                SET stock = stock + ?,
                    productCode = ?
                WHERE shopId = ? AND productVariantId = ?
              `, item.quantity, currentProductCode, order.shopId, variantId);
              
              if ((result.changes || 0) === 0) {
                throw new Error(`Failed to update shop inventory for variant ${variantId}`);
              }
            } else {
              // If item doesn't exist, add it to inventory
              await db.run(`
                INSERT INTO shop_inventory (shopId, productId, productCode, productVariantId, name, price, color, size, stock, imageUrl)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
                order.shopId,
                item.productId,
                currentProductCode,
                variantId,
                item.name,
                item.price,
                item.variant.color,
                item.variant.size,
                item.quantity,
                item.imageUrl || null
              );
            }
          }

          // Commit transaction
          await db.run('COMMIT');
          
          // Create notification for the factory
          await createNotification({
            userType: 'factory',
            title: `Order Delivered and Inventory Updated`,
            description: `Order #${id} from ${order.shopName} has been delivered. Inventory updated.`,
            href: `/orders`,
          });
          
          // Create notification for the shop
          await createNotification({
            userType: 'shop',
            shopId: order.shopId,
            title: `Order Delivered`,
            description: `Your order #${id} has been delivered. Items added to your inventory.`,
            href: '/shop/orders',
          });
        } catch (inventoryError) {
          console.error('Error updating inventory:', inventoryError);
          // Rollback transaction if inventory update fails
          if (db) {
            await db.run('ROLLBACK');
          }
          
          // Rollback order status if inventory update fails
          await db.run(`
            UPDATE orders 
            SET status = ?
            WHERE id = ?
          `, currentOrder.status, id);
          
          return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
        }
      } else if (isClosed) {
        // Create notification for the factory
        await createNotification({
          userType: 'factory',
          title: `Order Delivered and Closed`,
          description: `Order #${id} from ${order.shopName} has been delivered and closed`,
          href: `/orders`,
        });
        
        // Create notification for the shop
        await createNotification({
          userType: 'shop',
          shopId: order.shopId,
          title: `Order Delivered`,
          description: `Your order #${id} has been delivered.`,
          href: '/shop/orders',
        });
      } else if (feedback) {
        // Create notification for the factory about feedback
        await createNotification({
          userType: 'factory',
          title: `Delivery Feedback`,
          description: `Feedback for order #${id} from ${order.shopName}: ${feedback}`,
          href: `/orders`,
        });
      }
    }

    return NextResponse.json({ message: 'Delivery information added successfully' });
  } catch (error) {
    console.error('Error adding delivery information:', error);
    // Rollback transaction if there's a general error
    if (db) {
      await db.run('ROLLBACK');
    }
    return NextResponse.json({ error: 'Failed to add delivery information' }, { status: 500 });
  }
}