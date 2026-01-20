import { NextResponse, NextRequest } from 'next/server';
import { getMarketingOrderByIdFromDB, updateMarketingOrderInDB, deleteMarketingOrderFromDB, getDailyProductionStatus } from '@/lib/marketing-orders';
import { getDb } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/marketing-orders/:id - Get a specific marketing order by ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log('GET /api/marketing-orders/:id called with id:', params.id);
    
    const order = await getMarketingOrderByIdFromDB(params.id);
    
    if (!order) {
      return NextResponse.json({ error: 'Marketing order not found' }, { status: 404 });
    }
    
    // Get daily production status for this order
    const dailyStatus = await getDailyProductionStatus(params.id);
    
    // Add daily status to the response
    const orderWithStatus = {
      ...order,
      dailyProductionStatus: dailyStatus
    };
    
    console.log('Marketing order fetched from database:', orderWithStatus);
    
    const response = NextResponse.json(orderWithStatus);
    
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
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check roles allowed to modify orders (including status updates and planning)
    const allowedRoles = ['factory', 'marketing', 'planning', 'sample_maker', 'sewing', 'packing'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: `Forbidden: ${user.role} role cannot modify marketing orders` }, { status: 403 });
    }
    
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
            
            // Get the product details
            const product = await db.get(`
              SELECT id, productCode, name, price, imageUrl 
              FROM products 
              WHERE productCode = ?
            `, order.productCode);
            
            if (product) {
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
                  // Variant doesn't exist, create a new one
                  console.log(`Variant not found for product ${order.productCode}, size ${item.size}, color ${item.color}. Creating new variant.`);
                  
                  // Generate a new variant ID
                  const newVariantId = `VAR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  
                  // Insert the new variant
                  await db.run(`
                    INSERT INTO product_variants (id, productId, color, size, stock)
                    VALUES (?, ?, ?, ?, ?)
                  `, newVariantId, product.id, item.color, item.size, item.quantity);
                  
                  console.log(`Created new variant ${newVariantId} for product ${product.id}`);
                }
              }
              
              // Get all product variants (including newly created ones)
              const variants = await db.all(`
                SELECT id, color, size, stock, imageUrl 
                FROM product_variants 
                WHERE productId = ?
              `, product.id);
              
              // Remove the automatic population of shop inventories
              // Shops will only get inventory when they actually order products
              
              // Create notification for shops about the new product/variants
              try {
                await createNotification({
                  userType: 'shop',
                  title: 'New Product Variant Available',
                  description: `New variant(s) of product "${product.name}" are now available for ordering.`,
                  href: '/shop/products',
                });
              } catch (notificationError) {
                console.error('Failed to create shop notification:', notificationError);
              }
            }
          }
        } catch (productError) {
          console.error('Error updating product readyToDeliver status or populating shop inventory:', productError);
        }
      }
      
      // Notify the next team based on the new status
      if (orderData.status) {
        let targetTeam = '';
        let targetHref = '';
        
        switch (orderData.status) {
          case 'Planning':
            targetTeam = 'planning';
            targetHref = '/production-dashboard';
            break;
          case 'Sample Making':
            targetTeam = 'sample_maker';
            targetHref = '/production-dashboard';
            break;
          case 'Cutting':
            targetTeam = 'cutting';
            targetHref = '/production-dashboard';
            break;
          case 'Sewing':
            targetTeam = 'sewing';
            targetHref = '/production-dashboard';
            break;
          case 'Finishing':
            targetTeam = 'finishing';
            targetHref = '/production-dashboard';
            break;
          case 'Quality Inspection':
            targetTeam = 'quality_inspection';
            targetHref = '/production-dashboard';
            break;
          case 'Packing':
            targetTeam = 'packing';
            targetHref = '/production-dashboard';
            break;
          case 'Delivery':
            targetTeam = 'factory';
            targetHref = '/marketing-orders';
            break;
        }
        
        if (targetTeam) {
          try {
            // Get order number for notification
            const db = await getDb();
            const order = await db.get('SELECT orderNumber, productName FROM marketing_orders WHERE id = ?', params.id);
            
            if (order) {
              await createNotification({
                userType: targetTeam as any,
                title: 'Order Status Updated',
                description: `Order ${order.orderNumber} for ${order.productName} is now in "${orderData.status}" stage.`,
                href: targetHref,
              });
            }
          } catch (notificationError) {
            console.error('Failed to create status change notification:', notificationError);
          }
        }
      }
      
      // Notify planning approval
      if (orderData.isPlanningApproved) {
        try {
          const db = await getDb();
          const order = await db.get('SELECT orderNumber, productName FROM marketing_orders WHERE id = ?', params.id);
          if (order) {
            await createNotification({
              userType: 'sample_maker',
              title: 'Planning Go-ahead Received',
              description: `Order ${order.orderNumber} for ${order.productName} has been approved by Planning.`,
              href: '/production-dashboard',
            });
          }
        } catch (notificationError) {
          console.error('Failed to create planning approval notification:', notificationError);
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
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'factory' && user.role !== 'marketing') {
      return NextResponse.json({ error: 'Forbidden: Only factory or marketing can delete orders' }, { status: 403 });
    }
    
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