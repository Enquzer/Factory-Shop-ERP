import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import { 
  clusterOrdersByProximity, 
  optimizeOrderClusters,
  optimizeDeliverySequence,
  scoreRouteEfficiency,
  type GeoPoint,
  type RouteOptimizationResult
} from '@/lib/route-optimization';
import { getDB } from '@/lib/db';
import { getDriverById } from '@/lib/drivers-sqlite';
import { assignOrderToDriver } from '@/lib/drivers-sqlite';

// GET /api/ecommerce-manager/route-optimization - Get route optimization suggestions
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'ecommerce') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'confirmed,processing,ready_for_dispatch,paid,pending,payment_received,ready';
    const vehicleType = searchParams.get('vehicleType') || 'car';
    const clusteringRadius = parseFloat(searchParams.get('radius') || '3');
    
    // Validate and sanitize status filter
    const validStatuses = ['confirmed', 'processing', 'ready_for_dispatch', 'paid', 'pending', 'payment_received', 'ready'];
    const statuses = statusFilter.split(',')
      .map(s => s.trim())
      .filter(s => validStatuses.includes(s));
    
    if (statuses.length === 0) {
      return NextResponse.json({
        clusters: [],
        unclusteredOrders: [],
        efficiencyMetrics: {
          clusteringEfficiency: 0,
          distanceEfficiency: 0,
          timeEfficiency: 0,
          overallScore: 0,
          totalOrders: 0,
          clusteredOrders: 0,
          unclusteredOrders: 0
        },
        optimizationSummary: {
          totalDistanceSaved: 0,
          estimatedTimeSaved: 0,
          efficiencyScore: 0,
          numberOfClusters: 0,
          averageOrdersPerCluster: 0
        },
        message: 'Invalid status filter'
      });
    }
    
    const db = await getDB();
    
    // Get pending orders with location data
    const ordersQuery = `
      SELECT 
        id,
        id as order_id,
        customerName,
        deliveryAddress,
        latitude,
        longitude,
        city,
        status,
        totalAmount,
        createdAt
      FROM ecommerce_orders 
      WHERE status IN (${statuses.map(() => '?').join(',')})
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
      ORDER BY createdAt DESC
    `;
    
    let orders;
    try {
      orders = await db.all(ordersQuery, statuses);
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to fetch orders from database', 
        details: dbError.message 
      }, { status: 500 });
    }
    
    console.log(`[ROUTE_OPTIMIZATION] Found ${orders.length} orders in DB for statuses: ${statuses.join(', ')}`);
    
    if (orders.length === 0) {
      return NextResponse.json({
        clusters: [],
        unclusteredOrders: [],
        efficiencyMetrics: {
          clusteringEfficiency: 0,
          distanceEfficiency: 0,
          timeEfficiency: 0,
          overallScore: 0,
          totalOrders: 0,
          clusteredOrders: 0,
          unclusteredOrders: 0
        },
        optimizationSummary: {
          totalDistanceSaved: 0,
          estimatedTimeSaved: 0,
          efficiencyScore: 0,
          numberOfClusters: 0,
          averageOrdersPerCluster: 0
        },
        message: 'No orders available for route optimization'
      });
    }
    
    // Convert to GeoPoint format
    let geoPoints: GeoPoint[];
    try {
      const ordersWithCoords = orders.filter((o: any) => o.latitude != null && o.longitude != null);
      console.log(`[ROUTE_OPTIMIZATION] Orders with non-null coords: ${ordersWithCoords.length}/${orders.length}`);

      geoPoints = orders
        .filter((order: any) => {
          const lat = parseFloat(order.latitude);
          const lng = parseFloat(order.longitude);
          const valid = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
          if (!valid && order.latitude != null) {
            console.log(`[ROUTE_OPTIMIZATION] Invalid coords for order ${order.id}: ${order.latitude}, ${order.longitude}`);
          }
          return valid;
        })
        .map((order: any) => ({
          lat: parseFloat(order.latitude),
          lng: parseFloat(order.longitude),
          orderId: String(order.id),
          customerName: order.customerName,
          address: order.deliveryAddress,
          deliveryTime: order.createdAt
        }));
      
      console.log(`[ROUTE_OPTIMIZATION] Final geoPoints for analysis: ${geoPoints.length}`);
      
      if (geoPoints.length === 0) {
        console.log('[ROUTE_OPTIMIZATION] No valid geo points found after filtering');
        return NextResponse.json({
          clusters: [],
          unclusteredOrders: [],
          efficiencyMetrics: {
            clusteringEfficiency: 0,
            distanceEfficiency: 0,
            timeEfficiency: 0,
            overallScore: 0,
            totalOrders: orders.length,
            clusteredOrders: 0,
            unclusteredOrders: orders.length
          },
          optimizationSummary: {
            totalDistanceSaved: 0,
            estimatedTimeSaved: 0,
            efficiencyScore: 0,
            numberOfClusters: 0,
            averageOrdersPerCluster: 0
          },
          message: 'No orders with valid location data available for route optimization'
        });
      }
    } catch (mappingError: any) {
      console.error('Error mapping orders to geo points:', mappingError);
      return NextResponse.json({ 
        error: 'Failed to process order data', 
        details: mappingError.message 
      }, { status: 500 });
    }
    
    // Set capacity based on vehicle type
    let vehicleCapacity = 5;
    switch (vehicleType.toLowerCase()) {
      case 'motorbike': vehicleCapacity = 3; break;
      case 'car': vehicleCapacity = 5; break;
      case 'van': vehicleCapacity = 10; break;
      case 'truck': vehicleCapacity = 20; break;
    }
    
    console.log(`[ROUTE_OPTIMIZATION] Running optimization with vehicle capacity: ${vehicleCapacity}, radius: ${clusteringRadius}`);
    
    // Perform route optimization - wrap in try-catch to catch specific errors
    let optimizationResult: RouteOptimizationResult;
    try {
      console.log('[ROUTE_OPTIMIZATION] About to call optimizeOrderClusters with:', {
        geoPointsCount: geoPoints.length,
        vehicleCapacity,
        clusteringRadius
      });
      
      optimizationResult = optimizeOrderClusters(
        geoPoints,
        vehicleCapacity,
        clusteringRadius
      );
      
      console.log(`[ROUTE_OPTIMIZATION] Optimization complete. Found ${optimizationResult?.clusters?.length || 0} clusters`);
    } catch (optimizationError: any) {
      console.error('Route optimization algorithm error:', optimizationError);
      console.error('Optimization error stack:', optimizationError.stack);
      console.error('Parameters passed:', { geoPointsCount: geoPoints.length, vehicleCapacity, clusteringRadius });
      return NextResponse.json({ 
        error: 'Failed to perform route optimization', 
        details: optimizationError.message,
        stack: process.env.NODE_ENV === 'development' ? optimizationError.stack : undefined
      }, { status: 500 });
    }
    
    // Enhance clusters with additional information
    let enhancedClusters;
    try {
      enhancedClusters = optimizationResult.clusters.map((cluster, index) => {
        // Generate a unique cluster ID
        const clusterId = `CLUSTER-${Date.now()}-${index}`;
        
        // Get detailed order information for each order in cluster
        const orderDetails = orders.filter((order: any) => 
          cluster.orders.some(gp => gp.orderId === String(order.id))
        );
        
        // Optimize delivery sequence
        const startPoint = {
          lat: 9.033, // Addis Ababa center as depot
          lng: 38.750,
          orderId: 'DEPOT',
          customerName: 'Shop Location'
        };
        
        let optimizedSequence;
        try {
          optimizedSequence = optimizeDeliverySequence(cluster.orders, startPoint);
        } catch (seqError: any) {
          console.error('Delivery sequence optimization error:', seqError);
          optimizedSequence = cluster.orders; // Fallback to original order
        }
        
        const { clusterId: existingClusterId, ...restCluster } = cluster; // Destructure to avoid duplication
        
        return {
          clusterId,
          ...restCluster,
          orderDetails: orderDetails.map((order: any) => ({
            id: order.id,
            order_id: order.order_id,
            customerName: order.customerName,
            deliveryAddress: order.deliveryAddress,
            city: order.city,
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt,
            latitude: order.latitude,
            longitude: order.longitude
          })),
          optimizedSequence: optimizedSequence.map(gp => ({
            orderId: gp.orderId,
            customerName: gp.customerName,
            address: gp.address,
            lat: gp.lat,
            lng: gp.lng
          })),
          sequenceDistance: cluster.totalDistance,
          estimatedCompletionTime: new Date(Date.now() + (cluster.estimatedDuration * 60000)).toISOString()
        };
      });
    } catch (clusterError: any) {
      console.error('Error enhancing clusters:', clusterError);
      return NextResponse.json({ 
        error: 'Failed to process clusters', 
        details: clusterError.message 
      }, { status: 500 });
    }
    
    // Get unclustered orders with details
    const unclusteredOrderDetails = orders.filter((order: any) =>
      optimizationResult.unclusteredOrders.some(gp => gp.orderId === order.id)
    );
    
    // Calculate efficiency scores
    let efficiencyScores;
    try {
      efficiencyScores = scoreRouteEfficiency(geoPoints, optimizationResult.clusters);
    } catch (scoreError: any) {
      console.error('Efficiency scoring error:', scoreError);
      efficiencyScores = {
        clusteringEfficiency: 0,
        distanceEfficiency: 0,
        timeEfficiency: 0,
        overallScore: 0
      };
    }
    
    return NextResponse.json({
      clusters: enhancedClusters,
      unclusteredOrders: unclusteredOrderDetails.map((order: any) => ({
        id: order.id,
        order_id: order.order_id,
        customerName: order.customerName,
        deliveryAddress: order.deliveryAddress,
        city: order.city,
        latitude: order.latitude,
        longitude: order.longitude,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt
      })),
      efficiencyMetrics: {
        ...efficiencyScores,
        totalOrders: orders.length,
        clusteredOrders: enhancedClusters.reduce((sum, cluster) => sum + cluster.orders.length, 0),
        unclusteredOrders: unclusteredOrderDetails.length
      },
      optimizationSummary: {
        totalDistanceSaved: optimizationResult.totalDistanceSaved,
        estimatedTimeSaved: optimizationResult.estimatedTimeSaved,
        efficiencyScore: optimizationResult.efficiencyScore,
        numberOfClusters: enhancedClusters.length,
        averageOrdersPerCluster: enhancedClusters.length > 0 
          ? Math.round(enhancedClusters.reduce((sum, cluster) => sum + cluster.orders.length, 0) / enhancedClusters.length)
          : 0
      },
      statusCounts: orders.reduce((acc: any, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}),
      noGpsCount: orders.length - geoPoints.length,
      parameters: {
        vehicleType,
        clusteringRadiusKm: clusteringRadius,
        maxOrdersPerVehicle: vehicleCapacity
      }
    });
    
  } catch (error: any) {
    console.error('Route optimization API error:', error);
    console.error('Full error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to generate route optimization', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST /api/ecommerce-manager/route-optimization - Apply route optimization to create assignments
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'ecommerce') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { clusterId, driverId, shopId, orderIds, trackingNumberPrefix = 'MLK' } = body;
    
    if (!clusterId || !driverId || !shopId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields or invalid order IDs', 
        required: ['clusterId', 'driverId', 'shopId', 'orderIds'] 
      }, { status: 400 });
    }

    const db = await getDB();
    
    // Get the driver info
    const driver = await getDriverById(driverId);
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Prepare placeholders for SQL IN clause
    const placeholders = orderIds.map(() => '?').join(',');
    const clusterOrdersQuery = `
      SELECT id, latitude, longitude, customerName, deliveryAddress
      FROM ecommerce_orders
      WHERE id IN (${placeholders})
    `;
    
    // Fetch only the specific orders requested for this cluster
    const clusterOrders = await db.all(clusterOrdersQuery, orderIds);

    if (clusterOrders.length === 0) {
       return NextResponse.json({ error: 'No valid orders found for the provided IDs' }, { status: 404 });
    }

    // Check Driver Capacity BEFORE starting assignment
    // We need to check if (active + new) > max
    let maxOrders = 1;
    if (driver.vehicleType === 'motorbike') maxOrders = 3;
    else if (driver.vehicleType === 'car') maxOrders = 5;
    else if (driver.vehicleType === 'van') maxOrders = 10;
    else if (driver.vehicleType === 'truck') maxOrders = 20;

    const activeAssignments = await db.get(`
      SELECT COUNT(*) as count FROM driver_assignments 
      WHERE driver_id = ? AND status != 'delivered' AND status != 'cancelled'
    `, [driverId]);
    
    const currentActive = activeAssignments?.count || 0;

    if ((currentActive + clusterOrders.length) > maxOrders) {
      return NextResponse.json({ 
        error: `Capacity exceeded. Driver has ${currentActive} active orders. Cluster has ${clusterOrders.length}. Max for ${driver.vehicleType} is ${maxOrders}.` 
      }, { status: 400 });
    }

    // Update driver status based on new capacity
    const newTotal = currentActive + clusterOrders.length;
    if (newTotal >= maxOrders) {
      await db.run('UPDATE drivers SET status = ? WHERE id = ?', ['busy', driverId]);
    } else {
      // Ensure they stay available if not full
      await db.run('UPDATE drivers SET status = ? WHERE id = ?', ['available', driverId]);
    }

    // Process each order in the cluster
    let ordersAssigned = 0;
    const trackingNumbers = [];
    const errors = [];

    for (const order of clusterOrders) {
      try {
        // Generate tracking number
        const trackingNumber = `${trackingNumberPrefix}-${Date.now()}-${ordersAssigned + 1}`;
        
        // Update order status and assign to driver
        await db.run(`
          UPDATE ecommerce_orders 
          SET status = ?, trackingNumber = ?, shopId = ?, dispatchDate = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, ['in_transit', trackingNumber, shopId, order.id]);

        // Create dispatch record
        await db.run(`
          INSERT INTO order_dispatches (
            order_id, driver_id, shop_id, tracking_number, estimated_delivery_time, 
            transport_cost, notes, status, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned', ?)
        `, [order.id, driverId, shopId, trackingNumber, null, 0, `Milk-run cluster assignment`, authResult.username]);

        // Create driver assignment
        // Note: assignOrderToDriver might throw if race condition happens, catch individual errors
        await assignOrderToDriver(driverId, order.id, authResult.username, 
          { lat: 9.033, lng: 38.750, name: 'Shop Location' }, // From shop
          { lat: order.latitude, lng: order.longitude, name: order.deliveryAddress } // To customer
        );

        trackingNumbers.push(trackingNumber);
        ordersAssigned++;
      } catch (err: any) {
        console.error(`Failed to assign order ${order.id}:`, err);
        errors.push({ orderId: order.id, error: err.message });
      }
    }

    // Return success response with details
    return NextResponse.json({
      success: ordersAssigned > 0,
      message: ordersAssigned === clusterOrders.length ? 'All orders assigned successfully' : 'Partial assignment completed',
      clusterId,
      driverId,
      driverName: driver.name || driver.username || `Driver ${driver.id}`,
      shopId,
      ordersAssigned,
      trackingNumbers,
      errors: errors.length > 0 ? errors : undefined,
      clusterOrders: clusterOrders.map((order: any) => ({
        id: order.id,
        customerName: order.customerName,
        deliveryAddress: order.deliveryAddress,
        latitude: order.latitude,
        longitude: order.longitude
      }))
    });
    
  } catch (error: any) {
    console.error('Route optimization assignment error:', error);
    return NextResponse.json({ 
      error: 'Failed to apply route optimization', 
      details: error.message 
    }, { status: 500 });
  }
}