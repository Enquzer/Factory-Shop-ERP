import { NextResponse } from 'next/server';
import { getAllShops } from '@/lib/shops-sqlite';

// GET /api/public-shops - Get public shop locations for map integration
export async function GET() {
  try {
    // Fetch only active shops for public display
    const allShops = await getAllShops();
    const publicShops = allShops.filter(shop => shop.status === 'Active');
    
    // Return only non-confidential shop information
    const shopLocations = publicShops.map(shop => ({
      id: shop.id,
      name: shop.name,
      city: shop.city,
      // Note: We're not including exactLocation for privacy reasons
      // In a real implementation, you might want to provide generalized location data
    }));
    
    const response = NextResponse.json(shopLocations);
    
    // Add cache control headers (cache for 1 hour)
    response.headers.set('Cache-Control', 'public, max-age=3600');
    response.headers.set('Expires', new Date(Date.now() + 3600000).toUTCString());
    
    return response;
  } catch (error) {
    console.error('Error fetching public shop data:', error);
    return NextResponse.json({ error: 'Failed to fetch shop data' }, { status: 500 });
  }
}