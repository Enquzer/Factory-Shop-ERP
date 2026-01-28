import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { format, subDays, parseISO, isValid } from 'date-fns';

// GET /api/reports?type=owner-kpis - Get all owner KPIs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'owner-kpis'; // Default to owner-kpis

    // Only handle owner-kpis type for now
    if (reportType !== 'owner-kpis') {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const shopId = searchParams.get('shopId') || null;
    const category = searchParams.get('category') || null;
    const region = searchParams.get('region') || null;
    const orderStatus = searchParams.get('orderStatus') || null;

    // Validate and parse dates
    let startDate: string;
    let endDate: string;

    try {
      // Validate start date
      if (startDateParam) {
        const parsedStartDate = parseISO(startDateParam);
        if (!isValid(parsedStartDate)) {
          throw new Error('Invalid start date');
        }
        startDate = format(parsedStartDate, 'yyyy-MM-dd');
      } else {
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      }

      // Validate end date
      if (endDateParam) {
        const parsedEndDate = parseISO(endDateParam);
        if (!isValid(parsedEndDate)) {
          throw new Error('Invalid end date');
        }
        endDate = format(parsedEndDate, 'yyyy-MM-dd');
      } else {
        endDate = format(new Date(), 'yyyy-MM-dd');
      }

      // Ensure start date is not after end date
      if (parseISO(startDate) > parseISO(endDate)) {
        throw new Error('Start date cannot be after end date');
      }
    } catch (dateError) {
      console.error('Date parsing error:', dateError);
      return NextResponse.json({ error: 'Invalid date format', details: (dateError as Error).message }, { status: 400 });
    }

    const db = await getDb();

    // 1. Core KPIs Overview
    // Total Sales Value
    let totalSalesQuery = `
      SELECT SUM(amount) as totalSales
      FROM orders 
      WHERE date BETWEEN ? AND ?
    `;
    let totalSalesParams: any[] = [startDate, endDate];

    if (shopId) {
      totalSalesQuery += ` AND shopId = ?`;
      totalSalesParams.push(shopId);
    }

    if (orderStatus) {
      totalSalesQuery += ` AND status = ?`;
      totalSalesParams.push(orderStatus);
    }

    const totalSalesResult = await db.get(totalSalesQuery, ...totalSalesParams);
    const totalSales = totalSalesResult?.totalSales || 0;

    // Total Orders
    let totalOrdersQuery = `
      SELECT COUNT(id) as totalOrders
      FROM orders 
      WHERE date BETWEEN ? AND ?
    `;
    let totalOrdersParams: any[] = [startDate, endDate];

    if (shopId) {
      totalOrdersQuery += ` AND shopId = ?`;
      totalOrdersParams.push(shopId);
    }

    if (orderStatus) {
      totalOrdersQuery += ` AND status = ?`;
      totalOrdersParams.push(orderStatus);
    }

    const totalOrdersResult = await db.get(totalOrdersQuery, ...totalOrdersParams);
    const totalOrders = totalOrdersResult?.totalOrders || 0;

    // Units Produced (from marketing orders)
    let unitsProducedQuery = `
      SELECT SUM(quantity) as unitsProduced
      FROM marketing_orders 
      WHERE createdAt BETWEEN ? AND ?
    `;
    // Ensure the date format is correct for SQLite datetime comparison
    const unitsProducedParams: any[] = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];

    const unitsProducedResult = await db.get(unitsProducedQuery, ...unitsProducedParams);
    const unitsProduced = unitsProducedResult?.unitsProduced || 0;

    // Active Shops
    const activeShopsResult = await db.get(`
      SELECT COUNT(id) as activeShops
      FROM shops 
      WHERE status = 'Active'
    `);
    const activeShops = activeShopsResult?.activeShops || 0;

    // Registered Shops
    const registeredShopsResult = await db.get(`
      SELECT COUNT(id) as registeredShops
      FROM shops
    `);
    const registeredShops = registeredShopsResult?.registeredShops || 0;

    // Average Order Value (AOV)
    const aov = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Get order items for additional metrics
    // We fetch from the 'orders' table directly and parse the 'items' JSON column
    // This is more robust than joining with 'order_items' which might be empty
    let ordersQuery = `
      SELECT id as orderId, amount, date, shopId, shopName, status, items
      FROM orders
      WHERE date BETWEEN ? AND ?
    `;
    let ordersParams: any[] = [startDate, endDate];

    if (shopId) {
      ordersQuery += ` AND shopId = ?`;
      ordersParams.push(shopId);
    }

    if (orderStatus) {
      ordersQuery += ` AND status = ?`;
      ordersParams.push(orderStatus);
    }

    const fetchedOrders = await db.all(ordersQuery, ...ordersParams);

    // Get all products to lookup categories
    const allProducts = await db.all(`SELECT id, category, name, imageUrl FROM products`);
    const productMeta: Record<string, any> = {};
    allProducts.forEach((p: any) => { productMeta[p.id] = p; });

    const orderItems: any[] = [];
    fetchedOrders.forEach((order: any) => {
      let items = [];
      try {
        items = JSON.parse(order.items);
      } catch (e) {
        console.error(`Error parsing items for order ${order.orderId}`);
      }

      (Array.isArray(items) ? items : []).forEach(item => {
        const pId = item.productId || item.variant?.productId;
        const pMeta = productMeta[pId];

        // Skip if category filter is active and doesn't match
        if (category && pMeta?.category !== category) return;

        orderItems.push({
          orderId: order.orderId,
          amount: order.amount,
          date: order.date,
          shopId: order.shopId,
          shopName: order.shopName,
          status: order.status,
          quantity: item.quantity || 0,
          price: item.price || 0,
          productId: pId,
          category: pMeta?.category || "Uncategorized"
        });
      });
    });

    // Units per Transaction (UPT)
    const totalUnitsSold = orderItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
    const upt = totalOrders > 0 ? totalUnitsSold / totalOrders : 0;


    // Customer Retention Rate
    const uniqueShopsInPeriod = [...new Set(orderItems.map((item: any) => item.shopId))].length;
    const customerRetentionRate = activeShops > 0 ? (uniqueShopsInPeriod / activeShops) * 100 : 0;

    // Order Fulfillment Rate
    const deliveredOrdersResult = await db.get(`
      SELECT COUNT(id) as deliveredOrders
      FROM orders 
      WHERE date BETWEEN ? AND ? AND status = 'Delivered'
    `, startDate, endDate);
    const deliveredOrders = deliveredOrdersResult?.deliveredOrders || 0;
    const orderFulfillmentRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    // On-Time Delivery Rate
    const onTimeDeliveredOrdersResult = await db.get(`
      SELECT COUNT(o.id) as onTimeDelivered
      FROM orders o
      WHERE o.date BETWEEN ? AND ? 
      AND o.status = 'Delivered'
      AND (o.deliveryDate IS NULL OR o.deliveryDate <= o.expectedReceiptDate OR o.expectedReceiptDate IS NULL)
    `, startDate, endDate);
    const onTimeDeliveredOrders = onTimeDeliveredOrdersResult?.onTimeDelivered || 0;
    const onTimeDeliveryRate = deliveredOrders > 0 ? (onTimeDeliveredOrders / deliveredOrders) * 100 : 0;

    // Marketing Order Completion Rate
    const completedMarketingOrdersResult = await db.get(`
      SELECT COUNT(id) as completed, COUNT(*) as total
      FROM marketing_orders 
      WHERE createdAt BETWEEN ? AND ?
    `, `${startDate} 00:00:00`, `${endDate} 23:59:59`);
    const marketingOrderCompletionRate = completedMarketingOrdersResult?.total > 0 ?
      (completedMarketingOrdersResult.completed / completedMarketingOrdersResult.total) * 100 : 0;

    // Best Selling Product
    const productSales: { [key: string]: { name: string, quantity: number, revenue: number, imageUrl?: string } } = {};
    orderItems.forEach((item: any) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: '', quantity: 0, revenue: 0, imageUrl: '' };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += (item.quantity * item.price);
    });

    // Get product names and images
    const productIds = Object.keys(productSales);
    if (productIds.length > 0) {
      const productsQuery = `SELECT id, name, imageUrl FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`;
      const products = await db.all(productsQuery, ...productIds);
      products.forEach((product: any) => {
        if (productSales[product.id]) {
          productSales[product.id].name = product.name;
          productSales[product.id].imageUrl = product.imageUrl;
        }
      });
    }

    const bestSellingProduct = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)[0] || { name: 'N/A', quantity: 0, imageUrl: '' };

    // Category sales data for charts
    const categorySales: { [key: string]: { totalValue: number, products: { [key: string]: any } } } = {};

    // Get product categories and build category sales data
    if (productIds.length > 0) {
      const productsWithCategoriesQuery = `SELECT id, name, imageUrl, category FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`;
      const productsWithCategories = await db.all(productsWithCategoriesQuery, ...productIds);

      // Get prices for products to calculate values
      const productPrices: { [key: string]: number } = {};
      const orderItemsWithPrices = await db.all(`
        SELECT DISTINCT oi.productId, p.price
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        WHERE oi.productId IN (${productIds.map(() => '?').join(',')})
      `, ...productIds);

      orderItemsWithPrices.forEach((item: any) => {
        productPrices[item.productId] = item.price;
      });

      productsWithCategories.forEach((product: any) => {
        const productId = product.id;
        const categoryName = product.category;
        const productQuantity = productSales[productId]?.quantity || 0;
        const productPrice = productPrices[productId] || 0;
        const productValue = productQuantity * productPrice;

        if (!categorySales[categoryName]) {
          categorySales[categoryName] = { totalValue: 0, products: {} };
        }

        categorySales[categoryName].totalValue += productValue;
        categorySales[categoryName].products[productId] = {
          name: product.name,
          quantity: productQuantity,
          imageUrl: product.imageUrl
        };
      });
    }

    // 4. Shop Performance & Sales KPIs
    // Shop Ranking (by Value and Quantity)
    
    // Get all active shops to ensure we only include them and consolidate by name
    const activeShopsList = await db.all(`SELECT id, name FROM shops WHERE status = 'Active'`);
    const activeShopIds = new Set(activeShopsList.map((s: any) => s.id));
    const shopIdToOfficialName = activeShopsList.reduce((acc: any, s: any) => { acc[s.id] = s.name; return acc; }, {} as any);

    const shopPerformanceAgg: { [key: string]: { name: string, sales: number, quantity: number } } = {};
    
    // Accumulate sales from fetchedOrders (once per order)
    fetchedOrders.forEach((order: any) => {
      if (!order.shopId || !activeShopIds.has(order.shopId)) return;
      
      const officialName = shopIdToOfficialName[order.shopId];
      if (!officialName) return;

      if (!shopPerformanceAgg[officialName]) {
        shopPerformanceAgg[officialName] = { name: officialName, sales: 0, quantity: 0 };
      }
      shopPerformanceAgg[officialName].sales += (Number(order.amount) || 0);
    });

    // Accumulate quantity from orderItems
    orderItems.forEach((item: any) => {
      if (!item.shopId || !activeShopIds.has(item.shopId)) return;
      
      const officialName = shopIdToOfficialName[item.shopId];
      if (!officialName) return;

      if (shopPerformanceAgg[officialName]) {
        shopPerformanceAgg[officialName].quantity += (Number(item.quantity) || 0);
      }
    });

    const shopRanking = Object.values(shopPerformanceAgg)
      .sort((a, b) => b.sales - a.sales);

    const topPerformingShop = shopRanking[0] || { name: 'N/A', sales: 0, quantity: 0 };

    // 2. Inventory & Stock KPIs
    // Total Stock (Quantity and Value)
    const inventoryResult = await db.all(`
      SELECT pv.stock, p.price, p.category, p.name, p.id as productId, p.imageUrl, pv.color, pv.size
      FROM product_variants pv
      JOIN products p ON pv.productId = p.id
    `);

    const totalStockQuantity = inventoryResult.reduce((sum: number, item: any) => sum + item.stock, 0);
    const totalStockValue = inventoryResult.reduce((sum: number, item: any) => sum + (item.stock * item.price), 0);

    // Detailed stock information by product
    const stockByProduct: { [key: string]: any } = {};
    inventoryResult.forEach((item: any) => {
      if (!stockByProduct[item.productId]) {
        stockByProduct[item.productId] = {
          productId: item.productId,
          name: item.name,
          category: item.category,
          totalStock: 0,
          totalValue: 0,
          variants: []
        };
      }
      stockByProduct[item.productId].totalStock += item.stock;
      stockByProduct[item.productId].totalValue += item.stock * item.price;
      stockByProduct[item.productId].variants.push({
        color: item.color,
        size: item.size,
        stock: item.stock,
        value: item.stock * item.price
      });
    });

    // Low Stock Alerts
    const lowStockResult = await db.all(`
      SELECT COUNT(*) as lowStockCount
      FROM product_variants pv
      JOIN products p ON pv.productId = p.id
      WHERE pv.stock = 0
    `);
    const lowStockProductCount = lowStockResult[0]?.lowStockCount || 0;

    // Get low stock raw materials count
    const lowStockRawMaterialsResult = await db.all(`
      SELECT COUNT(*) as lowStockCount
      FROM raw_materials
      WHERE currentBalance = 0
    `);
    const lowStockRawMaterialsCount = lowStockRawMaterialsResult[0]?.lowStockCount || 0;

    const lowStockAlerts = lowStockProductCount + lowStockRawMaterialsCount;

    // 3. Production & Marketing Order KPIs
    // Production Efficiency
    const productionEfficiencyResult = await db.get(`
      SELECT 
        SUM(CASE WHEN status = 'Completed' THEN quantity ELSE 0 END) as completed,
        SUM(quantity) as total
      FROM marketing_orders 
      WHERE createdAt BETWEEN ? AND ?
    `, `${startDate} 00:00:00`, `${endDate} 23:59:59`);

    const productionEfficiency = productionEfficiencyResult?.total > 0 ?
      (productionEfficiencyResult.completed / productionEfficiencyResult.total) * 100 : 0;


    // 5. Comparative & Trend Analytics
    // Previous period for comparison
    let prevStartDate: string;
    let prevEndDate: string;

    try {
      const parsedStartDate = parseISO(startDate);
      const parsedEndDate = parseISO(endDate);

      // Calculate the duration of the current period in days
      const periodDuration = Math.ceil((parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24));

      // Previous period: same duration but before the current period
      const prevPeriodEnd = subDays(parsedStartDate, 1);
      const prevPeriodStart = subDays(prevPeriodEnd, periodDuration);

      prevStartDate = format(prevPeriodStart, 'yyyy-MM-dd');
      prevEndDate = format(prevPeriodEnd, 'yyyy-MM-dd');
    } catch (dateError) {
      console.error('Previous period date calculation error:', dateError);
      // Fallback to default dates (previous 30 days)
      prevStartDate = format(subDays(new Date(), 60), 'yyyy-MM-dd');
      prevEndDate = format(subDays(new Date(), 31), 'yyyy-MM-dd');
    }

    const prevPeriodSalesResult = await db.get(`
      SELECT SUM(amount) as prevSales
      FROM orders 
      WHERE date BETWEEN ? AND ?
    `, prevStartDate, prevEndDate);
    const prevPeriodSales = prevPeriodSalesResult?.prevSales || 0;

    const salesGrowthMoM = prevPeriodSales > 0 ?
      ((totalSales - prevPeriodSales) / prevPeriodSales) * 100 : 0;

    // Compile all KPIs
    const kpis = {
      // Core KPIs
      totalSalesValue: totalSales,
      totalOrders,
      unitsProduced,
      activeShops,
      registeredShops,
      averageOrderValue: aov,
      unitsPerTransaction: upt,
      customerRetentionRate,
      orderFulfillmentRate,
      onTimeDeliveryRate,
      marketingOrderCompletionRate,
      bestSellingProduct,
      topPerformingShop,
      salesGrowthMoM,

      // Inventory KPIs
      totalStockQuantity,
      totalStockValue,
      lowStockAlerts,
      stockByProduct: Object.values(stockByProduct), // Add detailed stock information

      // Production KPIs
      productionEfficiency,

      // Shop Performance KPIs
      shopRanking: shopRanking.slice(0, 10), // Top 10 shops

      // Product information for visualization
      productInfo: productSales,

      // Additional data for frontend visualization
      bestSellingProducts: Object.values(productSales)
        .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
        .slice(0, 10)
        .map((product: any) => ({
          name: product.name,
          quantity: product.quantity,
          revenue: product.revenue,
          imageUrl: product.imageUrl
        })),

      // Sales trend data for charts
      salesTrend: orderItems
        .reduce((acc: any[], item: any) => {
          const dateKey = item.date.split('T')[0]; // Get date part only
          const existing = acc.find(entry => entry.date === dateKey);
          if (existing) {
            existing.totalSales += item.amount || 0;
          } else {
            acc.push({
              date: dateKey,
              totalSales: item.amount || 0
            });
          }
          return acc;
        }, [])
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),

      // Category data for charts
      categoryData: Object.entries(categorySales)
        .map(([category, data]: [string, any]) => ({
          name: category,
          value: data.totalValue,
          topProducts: Object.values(data.products)
            .sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0))
            .slice(0, 3)
            .map((product: any) => ({
              name: product.name,
              quantity: product.quantity,
              imageUrl: product.imageUrl
            }))
        }))
        .sort((a: any, b: any) => b.value - a.value),

      // Stock information for display
      stockInfo: Object.values(stockByProduct)
        .sort((a: any, b: any) => (b.totalValue || 0) - (a.totalValue || 0))
        .slice(0, 10)
        .map((product: any) => ({
          name: product.name,
          totalValue: product.totalValue,
          totalStock: product.totalStock,
          imageUrl: product.imageUrl
        })),

      // Filters used
      filters: {
        startDate,
        endDate,
        shopId,
        category,
        region,
        orderStatus
      }
    };

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching owner KPIs:', error);
    return NextResponse.json({ error: 'Failed to fetch owner KPIs', details: (error as Error).message }, { status: 500 });
  }
}