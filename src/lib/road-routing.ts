// Road Routing Utility using OSRM
export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  coordinates: [number, number][]; // [lat, lng] pairs
  distance: number; // in kilometers
  duration: number; // in minutes
  legs?: any[]; // optional legs info
}

/**
 * Get road route between two points using OSRM
 */
export async function getRoadRoute(
  start: RoutePoint, 
  end: RoutePoint
): Promise<RouteGeometry | null> {
  try {
    const startCoord = `${start.lng},${start.lat}`;
    const endCoord = `${end.lng},${end.lat}`;
    
    // Using OSRM routing service
    const response = await fetch(
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startCoord};${endCoord}?overview=full&geometries=geojson`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      
      // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
      const coordinates = route.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );
      
      return {
        coordinates,
        distance: route.distance / 1000, // meters to km
        duration: route.duration / 60, // seconds to minutes
        legs: route.legs
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Road routing failed:', error);
    return null;
  }
}

/**
 * Get multi-point route (for shop → driver → destination paths)
 */
export async function getMultiPointRoute(
  points: RoutePoint[]
): Promise<RouteGeometry | null> {
  if (points.length < 2) return null;
  
  try {
    // Format coordinates for OSRM (lng,lat format)
    const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
    
    const response = await fetch(
      `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      
      // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
      const coordinates = route.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );
      
      return {
        coordinates,
        distance: route.distance / 1000, // meters to km
        duration: route.duration / 60, // seconds to minutes
        legs: route.legs
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Multi-point routing failed:', error);
    return null;
  }
}

/**
 * Fallback to straight line calculation if road routing fails
 */
export function getStraightLineRoute(
  points: RoutePoint[]
): RouteGeometry {
  let totalDistance = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    const distance = calculateDistance(
      points[i].lat, points[i].lng,
      points[i + 1].lat, points[i + 1].lng
    );
    totalDistance += distance;
  }
  
  return {
    coordinates: points.map(p => [p.lat, p.lng] as [number, number]),
    distance: totalDistance,
    duration: totalDistance * 2 // Rough estimate: 2 minutes per km
  };
}

/**
 * Haversine distance calculation (fallback)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}