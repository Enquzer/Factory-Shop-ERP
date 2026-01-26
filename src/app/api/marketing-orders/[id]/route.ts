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
    const allowedRoles = ['factory', 'marketing', 'planning', 'sample_maker', 'sewing', 'packing', 'store'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: `Forbidden: ${user.role} role cannot modify marketing orders` }, { status: 403 });
    }
    
    console.log('PUT /api/marketing-orders/:id called with id:', params.id);
    
    const orderData = await request.json();
    const currentOrderData = await getMarketingOrderByIdFromDB(params.id);
    const success = await updateMarketingOrderInDB(params.id, orderData);
    
    if (success) {
      const db = await getDb();
      
      // 1. Handle price and product code updates if provided (e.g. from Store Receive page)
      if (orderData.items && orderData.items.length > 0) {
        const firstItem = orderData.items[0];
        const { price, productCode } = firstItem;
        
        const currentOrder = await db.get('SELECT productCode FROM marketing_orders WHERE id = ?', params.id);
        
        if (currentOrder) {
          if (price > 0) {
            await db.run('UPDATE products SET price = ? WHERE productCode = ?', price, currentOrder.productCode);
          }
          
          if (productCode && productCode !== currentOrder.productCode) {
            try {
              await db.run('UPDATE products SET productCode = ? WHERE productCode = ?', productCode, currentOrder.productCode);
              await db.run('UPDATE marketing_orders SET productCode = ? WHERE id = ?', productCode, params.id);
              currentOrder.productCode = productCode;
            } catch (err) {
              console.error('Failed to update product code:', err);
            }
          }
        }
      }

      // 2. Handle Handover to Store (Inventory Update)
      // This happens when the status is changed to 'Store' (usually from Packing)
      // We check if it was not 'Store' before, but is now 'Store', OR if isCompleted is being set to true for the first time
      // AND we check our new inventoryAdded flag to prevent double counting
      const isTransitioningToStore = currentOrderData && currentOrderData.status !== 'Store' && orderData.status === 'Store';
      const isFinishingRegistration = currentOrderData && !currentOrderData.isCompleted && orderData.isCompleted;
      const alreadyAdded = await db.get('SELECT inventoryAdded FROM marketing_orders WHERE id = ?', params.id).then((r: { inventoryAdded: number } | undefined) => r?.inventoryAdded === 1);

      if ((isTransitioningToStore || isFinishingRegistration) && !alreadyAdded) {
        try {
          const order = await db.get(`SELECT id, productCode, productName, status FROM marketing_orders WHERE id = ?`, params.id);
          
          if (order) {
            // Mark product as ready to deliver if it's not already
            await db.run(`
              UPDATE products 
              SET readyToDeliver = 1 
              WHERE productCode = ?
            `, order.productCode);

            const orderItems = await db.all(`SELECT size, color, quantity FROM marketing_order_items WHERE orderId = ?`, order.id);
            const product = await db.get(`SELECT id, name FROM products WHERE productCode = ?`, order.productCode);
            
            if (product) {
              console.log(`Adding items from marketing order ${order.id} to factory inventory for product ${product.id}`);
              for (const item of orderItems) {
                const quantity = Math.floor(Math.max(0, Number(item.quantity || 0)));
                if (quantity <= 0) continue;

                const variant = await db.get(`
                  SELECT pv.id, pv.stock FROM product_variants pv
                  JOIN products p ON pv.productId = p.id
                  WHERE p.productCode = ? AND pv.size = ? AND pv.color = ?
                `, order.productCode, item.size, item.color);
                
                if (variant) {
                  await db.run(`UPDATE product_variants SET stock = stock + ? WHERE id = ?`, quantity, variant.id);
                } else {
                  const newVariantId = `VAR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  await db.run(`
                    INSERT INTO product_variants (id, productId, color, size, stock)
                    VALUES (?, ?, ?, ?, ?)
                  `, newVariantId, product.id, item.color || 'Standard', item.size || 'M', quantity);
                }
              }
              
              // Set the flag so we don't add inventory again
              await db.run('UPDATE marketing_orders SET inventoryAdded = 1 WHERE id = ?', params.id);

              // Notify shops about new stock availability
              await createNotification({
                userType: 'shop',
                title: 'Inventory Updated from Factory',
                description: `New stock of "${product.name}" has been received by the store and is now available.`,
                href: '/shop/products',
              });
            }
          }
        } catch (error) {
          console.error('Error in handover to store logic:', error);
        }
      }

      // 3. Notify relevant teams about status change & Handle Requisitions
      if (orderData.status) {
        const order = await db.get('SELECT orderNumber, productName, productCode, quantity FROM marketing_orders WHERE id = ?', params.id);
        
        // Removed: Requisitions move to 'Release to Production' or manual planning trigger.

        const statusConfigs: Record<string, { team: string, href: string }> = {
          'Planning': { team: 'planning', href: '/production-dashboard' },
          'Sample Making': { team: 'sample_maker', href: '/production-dashboard' },
          'Cutting': { team: 'cutting', href: '/production-dashboard' },
          'Sewing': { team: 'sewing', href: '/production-dashboard' },
          'Finishing': { team: 'finishing', href: '/production-dashboard' },
          'Quality Inspection': { team: 'quality_inspection', href: '/production-dashboard' },
          'Packing': { team: 'packing', href: '/production-dashboard' },
          'Store': { team: 'store', href: '/store/dashboard' },
          'Delivery': { team: 'factory', href: '/marketing-orders' }
        };
        
        const config = statusConfigs[orderData.status];
        if (config && order) {
          await createNotification({
            userType: config.team as any,
            title: 'Order Status Updated',
            description: `Order ${order.orderNumber} for ${order.productName} is now in "${orderData.status}" stage.`,
            href: config.href,
          });
        }
      }

      // 4. Notify planning approval
      if (orderData.isPlanningApproved) {
        const order = await db.get('SELECT orderNumber, productName FROM marketing_orders WHERE id = ?', params.id);
        if (order) {
          await createNotification({
            userType: 'sample_maker',
            title: 'Planning Go-ahead Received',
            description: `Order ${order.orderNumber} for ${order.productName} has been approved by Planning.`,
            href: '/production-dashboard',
          });
        }
      }

      // 5. Notify QC for inspection
      if (orderData.qualityInspectionStatus === 'Pending') {
        const order = await db.get('SELECT orderNumber, productName FROM marketing_orders WHERE id = ?', params.id);
        if (order) {
          await createNotification({
            userType: 'quality_inspection',
            title: 'Inspection Requested',
            description: `Order ${order.orderNumber} for ${order.productName} is ready for quality inspection.`,
            href: '/quality-inspection',
          });
        }
      }

      return NextResponse.json({ message: 'Marketing order updated successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to update marketing order' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error updating marketing order:', error);
    return NextResponse.json({ error: 'Failed to update marketing order', details: error.message }, { status: 500 });
  }
}

// DELETE /api/marketing-orders/:id - Delete a marketing order
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Check roles
    if (user.role !== 'factory' && user.role !== 'marketing') {
      return NextResponse.json({ error: 'Forbidden: Only factory or marketing can delete orders' }, { status: 403 });
    }

    // Check status - only "Placed Order" can be deleted by non-super admins to avoid breaking production chains
    const order = await getMarketingOrderByIdFromDB(params.id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check if user is a super admin for order deletion purposes
    // Factory users are considered super admins for order deletion
    const isSuperAdmin = user.username === 'admin' || user.username === 'factory';
    
    if (!isSuperAdmin && order.status !== 'Placed Order') {
      return NextResponse.json({ error: 'Forbidden: Only orders in "Placed Order" status can be deleted by non-super admins' }, { status: 403 });
    }
    
    const success = await deleteMarketingOrderFromDB(params.id);
    return success ? NextResponse.json({ message: 'Deleted' }) : NextResponse.json({ error: 'Failed' }, { status: 500 });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}