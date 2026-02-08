// Dynamic Rerouting System for Real-time Delivery Optimization
import { getDB } from './db';
import { calculateDistance } from './utils';

export interface TrafficCondition {
  roadSegment: string;
  currentSpeed: number; // km/h
  normalSpeed: number; // km/h
  congestionLevel: 'low' | 'medium' | 'high' | 'severe';
  incident?: {
    type: 'accident' | 'construction' | 'weather' | 'other';
    description: string;
    severity: 'minor' | 'moderate' | 'major';
  };
}

export interface RouteUpdate {
  clusterId: string;
  originalRoute: any[];
  optimizedRoute: any[];
  timeSaved: number; // minutes
  distanceSaved: number; // km
  reason: string;
  timestamp: Date;
}

export interface DynamicRoutingService {
  monitorTrafficConditions(): Promise<TrafficCondition[]>;
  analyzeRouteEfficiency(clusterId: string): Promise<RouteAnalysis>;
  suggestRouteOptimizations(clusterId: string): Promise<RouteUpdate[]>;
  applyDynamicRerouting(clusterId: string, newRoute: any[]): Promise<boolean>;
}

export interface RouteAnalysis {
  currentEfficiency: number; // 0-100
  potentialImprovement: number; // percentage
  bottlenecks: Array<{
    location: { lat: number, lng: number };
    delayMinutes: number;
    cause: string;
  }>;
  alternativeRoutes: Array<{
    path: any[];
    estimatedTime: number;
    distance: number;
    confidence: number; // 0-100
  }>;
}

/**
 * Mock traffic monitoring service (would integrate with real traffic APIs)
 */
class MockTrafficService {
  private static instance: MockTrafficService;
  private trafficConditions: Map<string, TrafficCondition> = new Map();

  private constructor() {
    this.initializeMockTraffic();
  }

  static getInstance(): MockTrafficService {
    if (!MockTrafficService.instance) {
      MockTrafficService.instance = new MockTrafficService();
    }
    return MockTrafficService.instance;
  }

  private initializeMockTraffic() {
    // Simulate common traffic patterns in Addis Ababa
    const mockConditions: TrafficCondition[] = [
      {
        roadSegment: "bole_road",
        currentSpeed: 15,
        normalSpeed: 30,
        congestionLevel: "high",
        incident: {
          type: "construction",
          description: "Road construction near Bole Medhanealem",
          severity: "moderate"
        }
      },
      {
        roadSegment: "gerji_ring_road",
        currentSpeed: 25,
        normalSpeed: 40,
        congestionLevel: "medium"
      },
      {
        roadSegment: "mekanisa_road",
        currentSpeed: 35,
        normalSpeed: 35,
        congestionLevel: "low"
      }
    ];

    mockConditions.forEach(condition => {
      this.trafficConditions.set(condition.roadSegment, condition);
    });
  }

  async getTrafficConditions(): Promise<TrafficCondition[]> {
    // Simulate real-time updates
    return Array.from(this.trafficConditions.values()).map(condition => ({
      ...condition,
      currentSpeed: condition.currentSpeed + (Math.random() * 10 - 5) // Random fluctuations
    }));
  }

  async getRoadSegmentCondition(segment: string): Promise<TrafficCondition | null> {
    return this.trafficConditions.get(segment) || null;
  }
}

/**
 * Dynamic Routing Service Implementation
 */
export class DynamicRoutingServiceImpl implements DynamicRoutingService {
  private trafficService = MockTrafficService.getInstance();

  async monitorTrafficConditions(): Promise<TrafficCondition[]> {
    return await this.trafficService.getTrafficConditions();
  }

  async analyzeRouteEfficiency(clusterId: string): Promise<RouteAnalysis> {
    const db = await getDB();
    
    // Get current cluster route
    const clusterQuery = `
      SELECT 
        da.id,
        da.order_id,
        eo.latitude,
        eo.longitude,
        eo.deliveryAddress
      FROM driver_assignments da
      JOIN ecommerce_orders eo ON da.order_id = eo.id
      WHERE da.id = ? AND da.status IN ('assigned', 'accepted', 'picked_up', 'in_transit')
      ORDER BY da.sequence_order ASC
    `;
    
    const routePoints = await db.all(clusterQuery, [clusterId]);
    
    if (routePoints.length === 0) {
      throw new Error('Cluster not found or no active assignments');
    }
    
    // Analyze current route efficiency
    let totalTime = 0;
    let totalDistance = 0;
    const bottlenecks: RouteAnalysis['bottlenecks'] = [];
    
    // Calculate current route metrics
    for (let i = 0; i < routePoints.length - 1; i++) {
      const point1 = routePoints[i];
      const point2 = routePoints[i + 1];
      
      const distance = calculateDistance(
        point1.latitude, point1.longitude,
        point2.latitude, point2.longitude
      );
      
      totalDistance += distance;
      
      // Check for traffic conditions affecting this segment
      const trafficCondition = await this.checkTrafficBetweenPoints(
        point1.latitude, point1.longitude,
        point2.latitude, point2.longitude
      );
      
      if (trafficCondition) {
        const normalTime = (distance / trafficCondition.normalSpeed) * 60; // minutes
        const currentTime = (distance / trafficCondition.currentSpeed) * 60; // minutes
        const delay = currentTime - normalTime;
        
        if (delay > 5) { // Significant delay
          bottlenecks.push({
            location: { 
              lat: (point1.latitude + point2.latitude) / 2,
              lng: (point1.longitude + point2.longitude) / 2
            },
            delayMinutes: delay,
            cause: trafficCondition.incident?.description || `Traffic congestion: ${trafficCondition.congestionLevel}`
          });
        }
        
        totalTime += currentTime;
      } else {
        // Normal speed assumption
        totalTime += (distance / 30) * 60; // 30 km/h average
      }
    }
    
    // Generate alternative routes
    const alternativeRoutes = await this.generateAlternativeRoutes(routePoints);
    
    // Calculate efficiency score
    const currentEfficiency = Math.max(0, 100 - (bottlenecks.length * 15));
    const potentialImprovement = alternativeRoutes.length > 0 ? 
      Math.min(40, alternativeRoutes[0].confidence) : 0;
    
    return {
      currentEfficiency,
      potentialImprovement,
      bottlenecks,
      alternativeRoutes
    };
  }

  async suggestRouteOptimizations(clusterId: string): Promise<RouteUpdate[]> {
    const analysis = await this.analyzeRouteEfficiency(clusterId);
    
    if (analysis.alternativeRoutes.length === 0 || analysis.potentialImprovement < 10) {
      return []; // No significant improvements available
    }
    
    const bestAlternative = analysis.alternativeRoutes[0];
    const originalRoute = await this.getCurrentRoute(clusterId);
    
    // Calculate savings
    const timeSaved = analysis.bottlenecks.reduce((sum, bottleneck) => sum + bottleneck.delayMinutes, 0);
    const distanceSaved = Math.max(0, 
      originalRoute.reduce((sum: number, point: any, i: number, arr: any[]) => {
        if (i < arr.length - 1) {
          return sum + calculateDistance(
            point.latitude, point.longitude,
            arr[i + 1].latitude, arr[i + 1].longitude
          );
        }
        return sum;
      }, 0) - bestAlternative.distance
    );
    
    return [{
      clusterId,
      originalRoute,
      optimizedRoute: bestAlternative.path,
      timeSaved,
      distanceSaved,
      reason: `Avoided ${analysis.bottlenecks.length} traffic bottlenecks`,
      timestamp: new Date()
    }];
  }

  async applyDynamicRerouting(clusterId: string, newRoute: any[]): Promise<boolean> {
    try {
      const db = await getDB();
      
      // Update sequence orders for the new route
      for (let i = 0; i < newRoute.length; i++) {
        await db.run(
          'UPDATE driver_assignments SET sequence_order = ? WHERE id = ? AND order_id = ?',
          [i + 1, clusterId, newRoute[i].order_id]
        );
      }
      
      // Log the route change
      const logId = `ROUTE-CHANGE-${Date.now()}`;
      await db.run(`
        INSERT INTO route_optimization_log (
          id, cluster_id, change_type, reason, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        logId,
        clusterId,
        'rerouted',
        'Dynamic optimization based on traffic conditions'
      ]);
      
      return true;
    } catch (error) {
      console.error('Failed to apply dynamic rerouting:', error);
      return false;
    }
  }

  private async checkTrafficBetweenPoints(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): Promise<TrafficCondition | null> {
    // Simplified check - in reality would use more sophisticated geospatial queries
    const midpointLat = (lat1 + lat2) / 2;
    const midpointLng = (lng1 + lng2) / 2;
    
    // Check common road segments
    const segments = ['bole_road', 'gerji_ring_road', 'mekanisa_road'];
    for (const segment of segments) {
      const condition = await this.trafficService.getRoadSegmentCondition(segment);
      if (condition) {
        // Simple proximity check (would use proper geospatial indexing in production)
        const segmentCoords: Record<string, { lat: number, lng: number }> = {
          'bole_road': { lat: 9.020, lng: 38.760 },
          'gerji_ring_road': { lat: 8.980, lng: 38.790 },
          'mekanisa_road': { lat: 9.050, lng: 38.730 }
        };
        
        const segmentCoord = segmentCoords[segment];
        if (segmentCoord) {
          const distanceToSegment = calculateDistance(
            midpointLat, midpointLng,
            segmentCoord.lat, segmentCoord.lng
          );
          
          if (distanceToSegment < 2) { // Within 2km of segment
            return condition;
          }
        }
      }
    }
    
    return null;
  }

  private async generateAlternativeRoutes(routePoints: any[]): Promise<RouteAnalysis['alternativeRoutes']> {
    // Simplified alternative route generation
    // In production, this would use advanced algorithms like genetic algorithms or 
    // integrate with Google Maps/OSRM routing APIs
    
    const alternatives: RouteAnalysis['alternativeRoutes'] = [];
    
    // Generate one alternative by reversing the route (simple example)
    if (routePoints.length > 2) {
      const reversedRoute = [...routePoints].reverse();
      
      let altDistance = 0;
      let altTime = 0;
      
      for (let i = 0; i < reversedRoute.length - 1; i++) {
        const distance = calculateDistance(
          reversedRoute[i].latitude, reversedRoute[i].longitude,
          reversedRoute[i + 1].latitude, reversedRoute[i + 1].longitude
        );
        altDistance += distance;
        altTime += (distance / 25) * 60; // Conservative speed estimate
      }
      
      alternatives.push({
        path: reversedRoute,
        estimatedTime: altTime,
        distance: altDistance,
        confidence: 75 // Confidence in this alternative
      });
    }
    
    return alternatives.sort((a, b) => a.estimatedTime - b.estimatedTime);
  }

  private async getCurrentRoute(clusterId: string): Promise<any[]> {
    const db = await getDB();
    const query = `
      SELECT 
        da.order_id,
        eo.latitude,
        eo.longitude,
        eo.deliveryAddress
      FROM driver_assignments da
      JOIN ecommerce_orders eo ON da.order_id = eo.id
      WHERE da.id = ?
      ORDER BY da.sequence_order ASC
    `;
    return await db.all(query, [clusterId]);
  }
}

// Export singleton instance
export const dynamicRoutingService = new DynamicRoutingServiceImpl();

// Utility function to trigger dynamic rerouting check
export async function checkAndOptimizeRoutes(): Promise<void> {
  try {
    const db = await getDB();
    
    // Get all active clusters
    const activeClusters = await db.all(`
      SELECT DISTINCT da.id as cluster_id
      FROM driver_assignments da
      WHERE da.status IN ('assigned', 'accepted', 'picked_up', 'in_transit')
    `);
    
    for (const cluster of activeClusters) {
      const updates = await dynamicRoutingService.suggestRouteOptimizations(cluster.cluster_id);
      
      if (updates.length > 0) {
        const bestUpdate = updates[0];
        console.log(`[DYNAMIC ROUTING] Suggested optimization for cluster ${cluster.cluster_id}:`);
        console.log(`  Time saved: ${bestUpdate.timeSaved.toFixed(1)} minutes`);
        console.log(`  Distance saved: ${bestUpdate.distanceSaved.toFixed(2)} km`);
        console.log(`  Reason: ${bestUpdate.reason}`);
        
        // Apply the optimization (in production, might want human approval first)
        const applied = await dynamicRoutingService.applyDynamicRerouting(
          cluster.cluster_id,
          bestUpdate.optimizedRoute
        );
        
        if (applied) {
          console.log(`[DYNAMIC ROUTING] Successfully applied optimization to cluster ${cluster.cluster_id}`);
        }
      }
    }
  } catch (error) {
    console.error('[DYNAMIC ROUTING] Error during route optimization check:', error);
  }
}