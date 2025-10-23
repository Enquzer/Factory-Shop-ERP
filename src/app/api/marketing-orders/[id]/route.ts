import { NextResponse } from 'next/server';
import { getMarketingOrderByIdFromDB, updateMarketingOrderInDB, deleteMarketingOrderFromDB } from '@/lib/marketing-orders';
import { getDb } from '@/lib/db';

// GET /api/marketing-orders/:id - Get a specific marketing order by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('GET /api/marketing-orders/:id called with id:', params.id);
    
    const order = await getMarketingOrderByIdFromDB(params.id);
    
    if (!order) {
      return NextResponse.json({ error: 'Marketing order not found' }, { status: 404 });
    }
    
    console.log('Marketing order fetched from database:', order);
    
    const response = NextResponse.json(order);
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    console.log('Marketing order API response sent');
    return response;
  } catch (error) {
    console.error('Error fetching marketing order:', error);
    return NextResponse.json({ error: 'Failed to fetch marketing order' }, { status: 500 });
  }
}

// PUT /api/marketing-orders/:id - Update a marketing order
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('PUT /api/marketing-orders/:id called with id:', params.id);
    
    const orderData = await request.json();
    console.log('Order data received:', orderData);
    
    const success = await updateMarketingOrderInDB(params.id, orderData);
    
    console.log('Update marketing order result:', success);
    
    if (success) {
      // If the order is marked as completed, update the product to be ready for delivery
      // and update factory inventory with the produced quantities
      if (orderData.isCompleted) {
        try {
          const db = await getDb();
          
          // Update the product to be ready for delivery
          await db.run(`
            UPDATE products 
            SET readyToDeliver = 1 
            WHERE productCode = (
              SELECT productCode FROM marketing_orders WHERE id = ?
            )
          `, params.id);
          
          console.log('Product marked as ready to deliver for order:', params.id);
          
          // Get the order details including items
          const order = await db.get(`
            SELECT id, productCode, quantity FROM marketing_orders WHERE id = ?
          `, params.id);
          
          if (order) {
            // Get the order items (size/color breakdown)
            const orderItems = await db.all(`
              SELECT size, color, quantity FROM marketing_order_items WHERE orderId = ?
            `, order.id);
            
            // Update factory inventory for each item in the order
            for (const item of orderItems) {
              // Find the corresponding product variant
              const variant = await db.get(`
                SELECT pv.id, pv.stock
                FROM product_variants pv
                JOIN products p ON pv.productId = p.id
                WHERE p.productCode = ? AND pv.size = ? AND pv.color = ?
              `, order.productCode, item.size, item.color);
              
              if (variant) {
                // Update the factory inventory by adding the produced quantity
                const newStock = variant.stock + item.quantity;
                await db.run(`
                  UPDATE product_variants 
                  SET stock = ? 
                  WHERE id = ?
                `, newStock, variant.id);
                
                console.log(`Updated factory inventory for variant ${variant.id}: ${variant.stock} -> ${newStock}`);
              } else {
                console.log(`Variant not found for product ${order.productCode}, size ${item.size}, color ${item.color}`);
              }
            }
            
            // Get the product details
            const product = await db.get(`
              SELECT id, productCode, name, price, imageUrl 
              FROM products 
              WHERE productCode = ?
            `, order.productCode);
            
            if (product) {
              // Get all product variants
              const variants = await db.all(`
                SELECT id, color, size, stock, imageUrl 
                FROM product_variants 
                WHERE productId = ?
              `, product.id);
              
              // Get all active shops
              const shops = await db.all(`
                SELECT id FROM shops WHERE status = 'Active'
              `);
              
              // Add product variants to each shop's inventory with 0 stock initially
              for (const shop of shops) {
                for (const variant of variants) {
                  // Check if this variant is already in the shop's inventory
                  const existingItem = await db.get(`
                    SELECT id FROM shop_inventory 
                    WHERE shopId = ? AND productVariantId = ?
                  `, shop.id, variant.id);
                  
                  // If not, add it with 0 stock
                  if (!existingItem) {
                    await db.run(`
                      INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock, imageUrl)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                      shop.id,
                      product.id,
                      variant.id,
                      product.name,
                      product.price,
                      variant.color,
                      variant.size,
                      0, // Start with 0 stock
                      variant.imageUrl || product.imageUrl || null
                    );
                    console.log(`Added variant ${variant.id} to shop ${shop.id} inventory`);
                  }
                }
              }
            }
          }
        } catch (productError) {
          console.error('Error updating product readyToDeliver status or populating shop inventory:', productError);
        }
      }
      
      console.log('Marketing order updated successfully');
      return NextResponse.json({ message: 'Marketing order updated successfully' });
    } else {
      console.error('Failed to update marketing order - updateMarketingOrderInDB returned false');
      return NextResponse.json({ error: 'Failed to update marketing order' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error updating marketing order:', error);
    return NextResponse.json({ 
      error: 'Failed to update marketing order', 
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE /api/marketing-orders/:id - Delete a marketing order
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const success = await deleteMarketingOrderFromDB(params.id);
    
    if (success) {
      return NextResponse.json({ message: 'Marketing order deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to delete marketing order' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting marketing order:', error);
    return NextResponse.json({ error: 'Failed to delete marketing order' }, { status: 500 });
  }
}