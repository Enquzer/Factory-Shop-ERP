import { NextResponse } from 'next/server';
import { getShops, getPaginatedShops, getShopByUsername, updateShop, type Shop } from '@/lib/shops';
import { registerUser } from '@/lib/auth-sqlite';
import { createShop, getShopById } from '@/lib/shops-sqlite';
import { getUserById } from '@/lib/auth-sqlite';

// Helper function to get user from request headers (if we had authentication)
// For now, we'll rely on the frontend to prevent unauthorized updates
async function getUserFromRequest(request: Request) {
  // In a real implementation, we would extract user info from JWT token or session
  // For this project, we'll return null and rely on frontend validation
  return null;
}

// GET /api/shops - Get all shops with optional pagination or a specific shop by ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('id');
    
    // If shopId is provided, return that specific shop
    if (shopId) {
      const shop = await getShopById(shopId);
      
      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }
      
      // Return the shop data
      const cleanShop = {
        id: shop.id,
        username: shop.username,
        name: shop.name,
        contactPerson: shop.contactPerson,
        contactPhone: shop.contactPhone,
        city: shop.city,
        exactLocation: shop.exactLocation,
        tradeLicenseNumber: shop.tradeLicenseNumber,
        tinNumber: shop.tinNumber,
        discount: shop.discount,
        status: shop.status,
        monthlySalesTarget: shop.monthlySalesTarget
      };
      
      const response = NextResponse.json(cleanShop);
      
      // Add cache control headers to prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // If page and limit are not specified or are 0, return all shops
    if (page <= 0 || limit <= 0) {
      const shops = await getShops();
      // Ensure we only return fields that match the Shop type exactly
      const cleanShops = shops.map((shop: Shop) => ({
        id: shop.id,
        username: shop.username,
        name: shop.name,
        contactPerson: shop.contactPerson,
        contactPhone: shop.contactPhone,
        city: shop.city,
        exactLocation: shop.exactLocation,
        tradeLicenseNumber: shop.tradeLicenseNumber,
        tinNumber: shop.tinNumber,
        discount: shop.discount,
        status: shop.status,
        monthlySalesTarget: shop.monthlySalesTarget
      }));
      const response = NextResponse.json(cleanShops);
      
      // Add cache control headers to prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      
      return response;
    }
    
    // Return paginated results
    const paginatedShops = await getPaginatedShops(page, limit);
    
    // Ensure we only return fields that match the Shop type exactly
    const cleanShops = paginatedShops.shops.map((shop: Shop) => ({
      id: shop.id,
      username: shop.username,
      name: shop.name,
      contactPerson: shop.contactPerson,
      contactPhone: shop.contactPhone,
      city: shop.city,
      exactLocation: shop.exactLocation,
      tradeLicenseNumber: shop.tradeLicenseNumber,
      tinNumber: shop.tinNumber,
      discount: shop.discount,
      status: shop.status,
      monthlySalesTarget: shop.monthlySalesTarget
    }));
    
    const response = NextResponse.json({
      shops: cleanShops,
      totalCount: paginatedShops.totalCount,
      currentPage: paginatedShops.currentPage,
      totalPages: paginatedShops.totalPages,
      hasNextPage: paginatedShops.hasNextPage,
      hasPreviousPage: paginatedShops.hasPreviousPage
    });
    
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
  }
}

// POST /api/shops - Create a new shop
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.username || !body.password || !body.name || !body.contactPerson || !body.city || !body.exactLocation) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if username already exists
    const existingShop = await getShopByUsername(body.username);
    if (existingShop) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }
    
    // Register user for authentication
    const userResult = await registerUser(body.username, body.password, 'shop');
    
    if (!userResult.success) {
      return NextResponse.json({ error: userResult.message }, { status: 500 });
    }
    
    // Create shop record
    const shopData = {
      username: body.username,
      name: body.name,
      contactPerson: body.contactPerson,
      contactPhone: body.contactPhone || "",
      city: body.city,
      exactLocation: body.exactLocation,
      tradeLicenseNumber: body.tradeLicenseNumber || "",
      tinNumber: body.tinNumber || "",
      discount: body.discount || 0,
      status: 'Pending' as const,
      monthlySalesTarget: body.monthlySalesTarget || 0
    };
    
    const newShop = await createShop(shopData);
    
    // Return the created shop (excluding sensitive information)
    const cleanShop = {
      id: newShop.id,
      username: newShop.username,
      name: newShop.name,
      contactPerson: newShop.contactPerson,
      contactPhone: newShop.contactPhone,
      city: newShop.city,
      exactLocation: newShop.exactLocation,
      tradeLicenseNumber: newShop.tradeLicenseNumber,
      tinNumber: newShop.tinNumber,
      discount: newShop.discount,
      status: newShop.status,
      monthlySalesTarget: newShop.monthlySalesTarget
    };
    
    return NextResponse.json(cleanShop, { status: 201 });
  } catch (error) {
    console.error('Error creating shop:', error);
    return NextResponse.json({ error: 'Failed to create shop' }, { status: 500 });
  }
}

// PUT /api/shops - Update a shop
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Get the shop being updated to check if discount is being modified
    // In a real implementation, we would verify the user's role through authentication
    // For now, we'll add a comment that this should be implemented in a production environment
    
    // Security note: In a production environment, you should implement proper authentication
    // and authorization to verify that only factory users can update the discount field.
    // This could be done by:
    // 1. Including a JWT token in the request headers
    // 2. Verifying the token and extracting the user's role
    // 3. Checking if the user has permission to update the discount field
    
    // For now, we're relying on the frontend to prevent unauthorized updates
    
    // Update shop record
    const updated = await updateShop(shopId, body);
    
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Shop updated successfully' });
  } catch (error) {
    console.error('Error updating shop:', error);
    return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 });
  }
}

// DELETE /api/shops - Delete a shop
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('id');
    
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }
    
    // Delete shop record
    // Note: We should also delete the associated user, but for now we'll just delete the shop
    const db = await getDb();
    const result = await db.run(`DELETE FROM shops WHERE id = ?`, shopId);
    const deleted = (result.changes || 0) > 0;
    
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete shop' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Error deleting shop:', error);
    return NextResponse.json({ error: 'Failed to delete shop' }, { status: 500 });
  }
}

// Helper function to get database connection
async function getDb() {
  const { getDb } = await import('@/lib/db');
  return await getDb();
}