import { NextResponse } from 'next/server';
import { getShops, getPaginatedShops, getShopByUsername, type Shop } from '@/lib/shops';
import { registerUser } from '@/lib/auth-sqlite';
import { createShop, getShopById, updateShop } from '@/lib/shops-sqlite';
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
    const username = searchParams.get('username');

    // If shopId is provided, return that specific shop
    if (shopId) {
      const shop = await getShopById(shopId);

      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }

      // Return the shop data including new fields for variant visibility control
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
        monthlySalesTarget: shop.monthlySalesTarget,
        // New fields for variant visibility control
        showVariantDetails: shop.showVariantDetails,
        maxVisibleVariants: shop.maxVisibleVariants,
        telegram_channel_id: shop.telegram_channel_id,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt
      };

      const response = NextResponse.json(cleanShop);

      // Add cache control headers to prevent caching
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;
    }

    // If username is provided, return that specific shop
    if (username) {
      const shop = await getShopByUsername(username);

      if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }

      // Return the shop data including new fields for variant visibility control
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
        monthlySalesTarget: shop.monthlySalesTarget,
        // New fields for variant visibility control
        showVariantDetails: shop.showVariantDetails,
        maxVisibleVariants: shop.maxVisibleVariants,
        telegram_channel_id: shop.telegram_channel_id,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt
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
        monthlySalesTarget: shop.monthlySalesTarget,
        // New fields for variant visibility control
        showVariantDetails: shop.showVariantDetails,
        maxVisibleVariants: shop.maxVisibleVariants,
        telegram_channel_id: shop.telegram_channel_id,
        createdAt: shop.createdAt,
        updatedAt: shop.updatedAt
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
      monthlySalesTarget: shop.monthlySalesTarget,
      // New fields for variant visibility control
      showVariantDetails: shop.showVariantDetails,
      maxVisibleVariants: shop.maxVisibleVariants,
      telegram_channel_id: shop.telegram_channel_id,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt
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
  try {
    console.log('=== Shop Registration Debug Info ===');

    // Parse the request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      throw new ValidationError('Invalid request body. Expected JSON data.');
    }

    // Sanitize input data
    const sanitizedData = sanitizeInput(body);
    console.log('Sanitized data:', sanitizedData);

    // Validate input data
    try {
      const validationResult = shopSchema.parse(sanitizedData);
      console.log('Validation result:', validationResult);
    } catch (validationError: any) {
      console.error('Validation error:', validationError.errors);
      throw new ValidationError('Invalid input data', validationError.errors);
    }

    // Validate required fields
    if (!sanitizedData.username || !sanitizedData.password || !sanitizedData.name || !sanitizedData.contactPerson || !sanitizedData.city || !sanitizedData.exactLocation) {
      const missingFields = [];
      if (!sanitizedData.username) missingFields.push('username');
      if (!sanitizedData.password) missingFields.push('password');
      if (!sanitizedData.name) missingFields.push('name');
      if (!sanitizedData.contactPerson) missingFields.push('contactPerson');
      if (!sanitizedData.city) missingFields.push('city');
      if (!sanitizedData.exactLocation) missingFields.push('exactLocation');
      throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Check if username already exists
    console.log('Checking if username exists:', sanitizedData.username);
    const existingShop = await getShopByUsername(sanitizedData.username);
    console.log('Existing shop check result:', existingShop);
    if (existingShop) {
      throw new ConflictError('Username already exists');
    }

    // Register user for authentication
    console.log('Registering user with data:', {
      username: sanitizedData.username,
      role: 'shop'
    });
    const userResult = await registerUser(sanitizedData.username, sanitizedData.password, 'shop');
    console.log('User registration result:', userResult);

    if (!userResult.success) {
      throw new Error(userResult.message || 'Failed to register user');
    }

    // Separate password from shop data as it's handled separately
    const { password, ...shopDataWithoutPassword } = sanitizedData;

    // Create shop record
    const shopData = {
      username: shopDataWithoutPassword.username,
      name: shopDataWithoutPassword.name,
      contactPerson: shopDataWithoutPassword.contactPerson,
      contactPhone: shopDataWithoutPassword.contactPhone || "",
      city: shopDataWithoutPassword.city,
      exactLocation: shopDataWithoutPassword.exactLocation,
      tradeLicenseNumber: shopDataWithoutPassword.tradeLicenseNumber || "",
      tinNumber: shopDataWithoutPassword.tinNumber || "",
      discount: shopDataWithoutPassword.discount || 0,
      status: shopDataWithoutPassword.status || 'Active', // Default to Active status
      monthlySalesTarget: shopDataWithoutPassword.monthlySalesTarget || 0,
      // New fields for variant visibility control with proper defaults
      showVariantDetails: shopDataWithoutPassword.showVariantDetails !== undefined ? shopDataWithoutPassword.showVariantDetails : true,
      maxVisibleVariants: shopDataWithoutPassword.maxVisibleVariants || 1000,
      // Telegram integration
      telegram_channel_id: shopDataWithoutPassword.telegram_channel_id || null
    };

    try {
      console.log('Creating shop with data:', shopData);
      const newShop = await createShop(shopData);
      console.log('Created shop:', newShop);

      // Log audit entry (without user info since there's no authentication)
      console.log(`Created shop "${newShop.name}" with username "${newShop.username}"`);

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
        monthlySalesTarget: newShop.monthlySalesTarget,
        // New fields for variant visibility control
        showVariantDetails: newShop.showVariantDetails,
        maxVisibleVariants: newShop.maxVisibleVariants,
        telegram_channel_id: newShop.telegram_channel_id
      };

      console.log('Returning clean shop data:', cleanShop);
      return NextResponse.json(cleanShop, { status: 201 });
    } catch (createShopError) {
      console.error('Error creating shop record, rolling back user creation:', createShopError);
      // Attempt to clean up the user we just created to avoid orphans
      try {
        const { deleteUserByUsername } = await import('@/lib/auth-sqlite');
        await deleteUserByUsername(sanitizedData.username);
        console.log(`Rolled back user creation for ${sanitizedData.username}`);
      } catch (rollbackError) {
        console.error('Failed to rollback user creation:', rollbackError);
      }
      throw createShopError; // Re-throw to be handled by the outer catch
    }
  } catch (error: any) {
    console.error('=== SHOP REGISTRATION ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    return handleErrorResponse(error);
  }
}

// PUT /api/shops - Update a shop (protected)
export async function PUT(request: NextRequest) {
  const handler = withRoleAuth(async (req, user) => {
    try {
      console.log('PUT /api/shops called by user:', user.username, user.role);
      const { searchParams } = new URL(req.url);
      const shopId = searchParams.get('id');

      if (!shopId) {
        console.error('Shop ID is required but not provided');
        return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
      }

      const body = await req.json();
      console.log(`PUT request received for shop ${shopId} with body:`, body);

      // Sanitize input data
      const sanitizedData = sanitizeInput(body);
      console.log(`Sanitized data for shop ${shopId}:`, sanitizedData);

      // Validate input data (only validate provided fields)
      const isStatusOnlyUpdate = Object.keys(sanitizedData).length === 1 && sanitizedData.status !== undefined;

      if (!isStatusOnlyUpdate && Object.keys(sanitizedData).length > 0) {
        try {
          const partialSchema = shopSchema.partial();
          partialSchema.parse(sanitizedData);
        } catch (validationError: any) {
          return NextResponse.json({ error: 'Invalid input data', details: validationError.errors }, { status: 400 });
        }
      }

      // Check permissions
      // Factory can update any shop. Shops can only update their own.
      const currentShop = await getShopById(shopId);
      if (!currentShop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      }

      // Normalized role check
      const isFactory = user.role === 'factory';
      const isOwner = user.role === 'shop' && user.username === currentShop.username;

      if (!isFactory && !isOwner) {
        throw new AuthorizationError('You do not have permission to update this shop');
      }

      // Update shop record
      const updated = await updateShop(shopId, sanitizedData);
      
      if (!updated) {
        return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 });
      }

      const updatedShop = await getShopById(shopId);
      
      // Log audit entry
      await logAuditEntry({
        userId: user.id,
        username: user.username,
        action: 'UPDATE',
        resourceType: 'SHOP',
        resourceId: shopId,
        details: `Updated shop information: ${Object.keys(sanitizedData).join(', ')}`
      });

      return NextResponse.json({ message: 'Shop updated successfully', updatedShop });
    } catch (error: any) {
      return handleErrorResponse(error);
    }
  }, ['factory', 'shop']);

  return handler(request);
}

// DELETE /api/shops - Delete a shop (protected - factory only)
export async function DELETE(request: NextRequest) {
  const handler = withRoleAuth(async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const shopId = searchParams.get('id');

      if (!shopId) {
        throw new ValidationError('Shop ID is required');
      }

      // Get current shop for audit logging
      const currentShop = await getShopById(shopId);

      if (!currentShop) {
        throw new Error('Shop not found');
      }

      // Delete shop record
      const db = await getDb();
      const result = await db.run(`DELETE FROM shops WHERE id = ?`, shopId);
      const deleted = (result.changes || 0) > 0;

      if (!deleted) {
        throw new Error('Failed to delete shop');
      }

      // Also delete the associated user
      const { deleteUserByUsername } = await import('@/lib/auth-sqlite');
      const userDeleted = await deleteUserByUsername(currentShop.username);

      if (!userDeleted) {
        console.warn(`Failed to delete user with username ${currentShop.username}`);
      }

      // Log audit entry
      await logAuditEntry({
        userId: user.id,
        username: user.username,
        action: 'DELETE',
        resourceType: 'SHOP',
        resourceId: shopId,
        details: `Deleted shop "${currentShop.name}"`
      });

      return NextResponse.json({ message: 'Shop deleted successfully' });
    } catch (error) {
      return handleErrorResponse(error);
    }
  }, 'factory');

  return handler(request);
}