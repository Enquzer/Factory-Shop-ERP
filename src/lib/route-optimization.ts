// Geographic Clustering and Route Optimization Library
import { calculateDistance } from './utils';

export interface GeoPoint {
  lat: number;
  lng: number;
  orderId?: string;
  customerName?: string;
  address?: string;
  deliveryTime?: string;
}

export interface OrderCluster {
  clusterId: string;
  orders: GeoPoint[];
  centroid: { lat: number, lng: number };
  totalDistance: number;
  maxDistanceFromDepot: number;
  estimatedDuration: number;
  driverCapacity: number;
  isOptimizable: boolean;
}

export interface RouteOptimizationResult {
  clusters: OrderCluster[];
  unclusteredOrders: GeoPoint[];
  efficiencyScore: number; // 0-100 scale
  totalDistanceSaved: number; // in kilometers
  estimatedTimeSaved: number; // in minutes
}

/**
 * Calculate centroid of a group of points
 */
function calculateCentroid(points: GeoPoint[]): { lat: number, lng: number } {
  if (points.length === 0) return { lat: 0, lng: 0 };
  
  const sumLat = points.reduce((sum, point) => sum + point.lat, 0);
  const sumLng = points.reduce((sum, point) => sum + point.lng, 0);
  
  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length
  };
}

/**
 * Calculate total distance for a route (simple sum of pairwise distances)
 */
function calculateRouteDistance(points: GeoPoint[]): number {
  if (points.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistance(
      points[i].lat, points[i].lng,
      points[i + 1].lat, points[i + 1].lng
    );
  }
  return totalDistance;
}

/**
 * Point-to-line distance helper (used for Milk-Run logic)
 * Calculates how far a point is from the straight path between depot and target
 */
function getPointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const lineDistance = calculateDistance(x1, y1, x2, y2);
  if (lineDistance === 0) return calculateDistance(px, py, x1, y1);
  
  // Standard point-to-line distance formula (rough approximation using lat/lng as Cartesian)
  const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineDistance * lineDistance);
  if (t < 0) return calculateDistance(px, py, x1, y1);
  if (t > 1) return calculateDistance(px, py, x2, y2);
  
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  
  return calculateDistance(px, py, projX, projY);
}

/**
 * Basic geographic clustering using distance threshold
 */
export function clusterOrdersByProximity(
  orders: GeoPoint[], 
  maxDistanceKm: number = 5,
  maxOrdersPerCluster: number = 5,
  depotLat: number = 9.033,
  depotLng: number = 38.750
): OrderCluster[] {
  
  if (orders.length === 0) return [];
  
  const clusters: OrderCluster[] = [];
  const clusteredOrderIds = new Set<string>();
  
  // Milk Run Logic: Sort orders by distance from depot DESCENDING
  // We start with the farthest order and pick up others "on the way"
  const ordersWithDistance = orders.map(o => ({
    ...o,
    distFromDepot: calculateDistance(depotLat, depotLng, o.lat, o.lng)
  })).sort((a, b) => b.distFromDepot - a.distFromDepot);
  
  for (const farthestOrder of ordersWithDistance) {
    if (clusteredOrderIds.has(farthestOrder.orderId || '')) continue;
    
    // This is our "anchor" for the cluster
    const clusterOrders: GeoPoint[] = [farthestOrder];
    clusteredOrderIds.add(farthestOrder.orderId || '');
    
    // Find neighbors that are "en route" or close to this anchor
    // We look for orders that are within 'maxDistanceKm' of the anchor OR
    // within a narrow corridor between depot and the anchor.
    const candidates = ordersWithDistance.filter(o => 
      !clusteredOrderIds.has(o.orderId || '') && 
      o.orderId !== farthestOrder.orderId
    );
    
    for (const candidate of candidates) {
      if (clusterOrders.length >= maxOrdersPerCluster) break;
      
      const distToAnchor = calculateDistance(candidate.lat, candidate.lng, farthestOrder.lat, farthestOrder.lng);
      const distToPath = getPointToLineDistance(
        candidate.lat, candidate.lng,
        depotLat, depotLng,
        farthestOrder.lat, farthestOrder.lng
      );
      
      // If order is close to the anchor OR very close to the direct path to the anchor
      if (distToAnchor <= maxDistanceKm || distToPath <= (maxDistanceKm / 2)) {
        clusterOrders.push(candidate);
        clusteredOrderIds.add(candidate.orderId || '');
      }
    }
    
    // Create cluster
    const centroid = calculateCentroid(clusterOrders);
    
    // Sort cluster orders by distance from depot to create a logical sequence
    const sequencedOrders = optimizeDeliverySequence(clusterOrders, { lat: depotLat, lng: depotLng });
    const intraClusterDistance = calculateRouteDistance(sequencedOrders);
    
    // Calculate full route distance: Depot -> First Order -> ... -> Last Order
    // (We treat it as one-way for "Distance to cover" or Round Trip if they return. 
    // Usually for Milk Run "Total Distance" implies the trip length.)
    // Let's do Depot -> First -> ... -> Last.
    const distToFirst = calculateDistance(depotLat, depotLng, sequencedOrders[0].lat, sequencedOrders[0].lng);
    const totalDistance = distToFirst + intraClusterDistance;

    // Calculate max distance from depot for this cluster
    const maxDistanceFromDepot = Math.max(...clusterOrders.map(o => 
      calculateDistance(depotLat, depotLng, o.lat, o.lng)
    ));
    
    clusters.push({
      clusterId: `CLUSTER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orders: sequencedOrders,
      centroid,
      totalDistance,
      maxDistanceFromDepot,
      estimatedDuration: totalDistance * 5, // Rough estimate: 5 min per km
      driverCapacity: maxOrdersPerCluster,
      isOptimizable: clusterOrders.length > 0
    });
  }
  
  return clusters;
}

/**
 * Advanced clustering with route optimization
 */
export function optimizeOrderClusters(
  orders: GeoPoint[],
  vehicleCapacity: number = 5,
  clusteringRadiusKm: number = 3
): RouteOptimizationResult {
  const depotLat = 9.033;
  const depotLng = 38.750;
  
  // Step 1: Milk-Run clustering
  const basicClusters = clusterOrdersByProximity(orders, clusteringRadiusKm, vehicleCapacity, depotLat, depotLng);
  
  // Step 2: Identify unclustered orders
  const clusteredOrderIds = new Set<string>();
  basicClusters.forEach(cluster => {
    cluster.orders.forEach(order => clusteredOrderIds.add(order.orderId || ''));
  });
  
  const unclusteredOrders = orders.filter(order => 
    !clusteredOrderIds.has(order.orderId || '')
  );
  
  // Step 3: Convert unclustered orders to single-order clusters
  unclusteredOrders.forEach(order => {
    basicClusters.push(createSingleOrderCluster(order, vehicleCapacity));
  });

  // Step 4: Calculate metrics (with everything clustered)
  const scores = scoreRouteEfficiency(orders, basicClusters);
  
  return {
    clusters: basicClusters,
    unclusteredOrders: [], // All converted to clusters
    efficiencyScore: scores.overallScore,
    totalDistanceSaved: scores.distanceEfficiency > 0 ? (scores.distanceEfficiency / 100) * 1000 : 0, 
    estimatedTimeSaved: scores.timeEfficiency > 0 ? scores.timeEfficiency * 10 : 0 
  };
}

/**
 * Helper to create a cluster from a single order
 */
function createSingleOrderCluster(order: GeoPoint, vehicleCapacity: number): OrderCluster {
  const depotLat = 9.033;
  const depotLng = 38.750;
  const distFromDepot = calculateDistance(depotLat, depotLng, order.lat, order.lng);
  
  return {
    clusterId: `CLUSTER-SINGLE-${order.orderId || Date.now()}`,
    orders: [order],
    centroid: { lat: order.lat, lng: order.lng },
    totalDistance: distFromDepot, 
    maxDistanceFromDepot: distFromDepot,
    estimatedDuration: distFromDepot * 5, // Rough estimate
    driverCapacity: vehicleCapacity,
    isOptimizable: true
  };
}

/**
 * Find optimal delivery sequence within a cluster
 */
export function optimizeDeliverySequence(orders: GeoPoint[], startPoint: GeoPoint): GeoPoint[] {
  if (orders.length === 0) return [];
  if (orders.length === 1) return orders;
  
  const unvisited = [...orders];
  const sequence: GeoPoint[] = [];
  let currentPoint = startPoint;
  
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = calculateDistance(currentPoint.lat, currentPoint.lng, unvisited[0].lat, unvisited[0].lng);
    
    for (let i = 1; i < unvisited.length; i++) {
      const d = calculateDistance(currentPoint.lat, currentPoint.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }
    
    sequence.push(unvisited[nearestIdx]);
    currentPoint = unvisited[nearestIdx];
    unvisited.splice(nearestIdx, 1);
  }
  
  return sequence;
}

/**
 * Score route efficiency
 */
export function scoreRouteEfficiency(
  originalOrders: GeoPoint[],
  optimizedClusters: OrderCluster[]
): { 
  clusteringEfficiency: number; 
  distanceEfficiency: number; 
  timeEfficiency: number; 
  overallScore: number; 
} {
  const depotLat = 9.033;
  const depotLng = 38.750;
  const totalOrders = originalOrders.length;
  if (totalOrders === 0) return { clusteringEfficiency: 0, distanceEfficiency: 0, timeEfficiency: 0, overallScore: 0 };

  const clusteredOrders = optimizedClusters.reduce((sum, cluster) => sum + cluster.orders.length, 0);
  const clusteringEfficiency = (clusteredOrders / totalOrders) * 100;
  
  const originalDistance = originalOrders.reduce((sum, order) => {
    return sum + calculateDistance(depotLat, depotLng, order.lat, order.lng) * 2;
  }, 0);
  
  const optimizedDistance = optimizedClusters.reduce((sum, cluster) => {
    if (cluster.orders.length === 0) return sum;
    const firstPoint = cluster.orders[0];
    const lastPoint = cluster.orders[cluster.orders.length - 1];
    return sum + 
      calculateDistance(depotLat, depotLng, firstPoint.lat, firstPoint.lng) +
      cluster.totalDistance +
      calculateDistance(lastPoint.lat, lastPoint.lng, depotLat, depotLng);
  }, 0);
  
  const distanceEfficiency = originalDistance > 0 ? ((originalDistance - optimizedDistance) / originalDistance) * 100 : 0;
  const timeEfficiency = Math.max(0, distanceEfficiency * 0.9);
  const overallScore = (clusteringEfficiency * 0.3) + (distanceEfficiency * 0.5) + (timeEfficiency * 0.2);
  
  return {
    clusteringEfficiency,
    distanceEfficiency: Math.max(0, distanceEfficiency),
    timeEfficiency: Math.max(0, timeEfficiency),
    overallScore: Math.min(100, Math.max(0, overallScore))
  };
}
