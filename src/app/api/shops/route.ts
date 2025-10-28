import { NextResponse } from 'next/server';
import { getShops, getPaginatedShops, getShopByUsername, updateShop, type Shop } from '@/lib/shops';
import { registerUser } from '@/lib/auth-sqlite';
import { createShop, getShopById } from '@/lib/shops-sqlite';
import { getUserById } from '@/lib/auth-sqlite';
import { withAuth, withRoleAuth, AuthenticatedUser } from '@/lib/auth-middleware';
import { NextRequest } from 'next/server';
import { shopSchema, sanitizeInput } from '@/lib/validation';
import { handleErrorResponse, ValidationError, ConflictError, AuthorizationError } from '@/lib/error-handler'; // Import AuthorizationError
import { logAuditEntry } from '@/lib/audit-logger'; // Import audit logger
import { getDb } from '@/lib/db'; // Import getDb function

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
    return handleErrorResponse(error);
  }
}

// POST /api/shops - Create a new shop (protected - factory only)
export async function POST(request: NextRequest) {
  return withRoleAuth(async (req, user) => {
    try {
      const body = await req.json();
      
      // Sanitize input data
      const sanitizedData = sanitizeInput(body);
      
      // Validate input data
      try {
        shopSchema.parse(sanitizedData);
      } catch (validationError: any) {
        throw new ValidationError('Invalid input data', validationError.errors);
      }
      
      // Validate required fields
      if (!sanitizedData.username || !sanitizedData.password || !sanitizedData.name || !sanitizedData.contactPerson || !sanitizedData.city || !sanitizedData.exactLocation) {
        throw new ValidationError('Missing required fields');
      }
      
      // Check if username already exists
      const existingShop = await getShopByUsername(sanitizedData.username);
      if (existingShop) {
        throw new ConflictError('Username already exists');
      }
      
      // Register user for authentication
      const userResult = await registerUser(sanitizedData.username, sanitizedData.password, 'shop');
      
      if (!userResult.success) {
        throw new Error(userResult.message || 'Failed to register user');
      }
      
      // Create shop record
      const shopData = {
        username: sanitizedData.username,
        name: sanitizedData.name,
        contactPerson: sanitizedData.contactPerson,
        contactPhone: sanitizedData.contactPhone || "",
        city: sanitizedData.city,
        exactLocation: sanitizedData.exactLocation,
        tradeLicenseNumber: sanitizedData.tradeLicenseNumber || "",
        tinNumber: sanitizedData.tinNumber || "",
        discount: sanitizedData.discount || 0,
        status: 'Pending' as const,
        monthlySalesTarget: sanitizedData.monthlySalesTarget || 0
      };
      
      const newShop = await createShop(shopData);
      
      // Log audit entry
      await logAuditEntry({
        userId: user.id,
        username: user.username,
        action: 'CREATE',
        resourceType: 'SHOP',
        resourceId: newShop.id,
        details: `Created shop "${newShop.name}" with username "${newShop.username}"`
      });
      
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
      return handleErrorResponse(error);
    }
  }, 'factory'); // Only factory users can create shops
}

// PUT /api/shops - Update a shop (protected - factory only for discount changes, shops can update their own info)
export async function PUT(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const shopId = searchParams.get('id');
      
      if (!shopId) {
        throw new ValidationError('Shop ID is required');
      }
      
      const body = await req.json();
      
      // Sanitize input data
      const sanitizedData = sanitizeInput(body);
      
      // Validate input data (only validate provided fields)
      if (Object.keys(sanitizedData).length > 0) {
        try {
          // Create a partial schema for validation
          const partialSchema = shopSchema.partial();
          partialSchema.parse(sanitizedData);
        } catch (validationError: any) {
          throw new ValidationError('Invalid input data', validationError.errors);
        }
      }
      
      // Check if discount is being modified and user is not factory
      if (sanitizedData.discount !== undefined && user.role !== 'factory') {
        throw new AuthorizationError('Only factory users can modify discount');
      }
      
      // If user is a shop, ensure they can only update their own profile
      if (user.role === 'shop') {
        const shop = await getShopById(shopId);
        if (!shop || shop.username !== user.username) {
          throw new AuthorizationError('Shops can only update their own profile');
        }
      }
      
      // Get current shop for audit logging
      const currentShop = await getShopById(shopId);
      
      // Update shop record
      const updated = await updateShop(shopId, sanitizedData);
      
      if (!updated) {
        throw new Error('Failed to update shop');
      }
      
      // Log audit entry
      if (currentShop) {
        await logAuditEntry({
          userId: user.id,
          username: user.username,
          action: 'UPDATE',
          resourceType: 'SHOP',
          resourceId: shopId,
          details: `Updated shop "${currentShop.name}" with username "${currentShop.username}"`
        });
      }
      
      return NextResponse.json({ message: 'Shop updated successfully' });
    } catch (error) {
      return handleErrorResponse(error);
    }
  }); // Allow both factory and shop users
}

// DELETE /api/shops - Delete a shop (protected - factory only)
export async function DELETE(request: NextRequest) {
  return withRoleAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const shopId = searchParams.get('id');
      
      if (!shopId) {
        throw new ValidationError('Shop ID is required');
      }
      
      // Get current shop for audit logging
      const currentShop = await getShopById(shopId);
      
      // Delete shop record
      // Note: We should also delete the associated user, but for now we'll just delete the shop
      const db = await getDb();
      const result = await db.run(`DELETE FROM shops WHERE id = ?`, shopId);
      const deleted = (result.changes || 0) > 0;
      
      if (!deleted) {
        throw new Error('Failed to delete shop');
      }
      
      // Log audit entry
      if (currentShop) {
        await logAuditEntry({
          userId: user.id,
          username: user.username,
          action: 'DELETE',
          resourceType: 'SHOP',
          resourceId: shopId,
          details: `Deleted shop "${currentShop.name}" with username "${currentShop.username}"`
        });
      }
      
      return NextResponse.json({ message: 'Shop deleted successfully' });
    } catch (error) {
      return handleErrorResponse(error);
    }
  }, 'factory'); // Only factory users can delete shops
}

