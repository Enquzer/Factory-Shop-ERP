import { getDb, resetDbCache } from './db';

export type Shop = {
  id: string;
  username: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  city: string;
  exactLocation: string;
  tradeLicenseNumber: string;
  tinNumber: string;
  discount: number;
  status: 'Active' | 'Inactive' | 'Pending';
  monthlySalesTarget: number;
  // New fields for variant visibility control
  showVariantDetails: boolean;
  maxVisibleVariants: number;
  // Timestamp fields
  createdAt?: string;
  updatedAt?: string;
  // Removed aiDistributionMode field
};

// Get all shops with pagination support
export async function getShops(limit: number = 10, offset: number = 0): Promise<{ shops: Shop[], totalCount: number }> {
  try {
    // Get a fresh database connection each time to avoid caching issues
    const db = await getDb();

    // Add a small delay to ensure database is ready
    await new Promise(resolve => setTimeout(resolve, 10));

    // Get the total count of shops
    const countResult = await db.get(`SELECT COUNT(*) as count FROM shops`);
    const totalCount = countResult.count;

    // Get shops with limit and offset
    const shops = await db.all(`
      SELECT * FROM shops
      ORDER BY name
      LIMIT ? OFFSET ?
    `, limit, offset);

    // Map database fields to Shop type
    const mappedShops = shops.map((shop: any) => ({
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
      showVariantDetails: shop.show_variant_details === 1,
      maxVisibleVariants: shop.max_visible_variants,
      createdAt: shop.created_at,
      updatedAt: shop.updated_at
      // Removed aiDistributionMode mapping
    }));

    console.log('Mapped shops:', mappedShops);

    return { shops: mappedShops, totalCount };
  } catch (error) {
    console.error('Error fetching shops:', error);
    return { shops: [], totalCount: 0 };
  }
}

// Get all shops without pagination (for backward compatibility)
export async function getAllShops(): Promise<Shop[]> {
  try {
    // Get a fresh database connection each time to avoid caching issues
    const db = await getDb();

    // Add a small delay to ensure database is ready
    await new Promise(resolve => setTimeout(resolve, 10));

    const shops = await db.all(`
      SELECT * FROM shops
      ORDER BY name
    `);

    // Map database fields to Shop type
    const mappedShops = shops.map((shop: any) => ({
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
      showVariantDetails: shop.show_variant_details === 1,
      maxVisibleVariants: shop.max_visible_variants,
      createdAt: shop.created_at,
      updatedAt: shop.updated_at
      // Removed aiDistributionMode mapping
    }));

    return mappedShops;
  } catch (error) {
    console.error('Error fetching shops:', error);
    return [];
  }
}

// Get a shop by ID
export async function getShopById(id: string): Promise<Shop | null> {
  try {
    // Get database connection
    const db = await getDb();

    const shop = await db.get(`
      SELECT * FROM shops WHERE id = ?
    `, id);

    if (!shop) {
      return null;
    }

    // Map database fields to Shop type
    const mappedShop = {
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
      showVariantDetails: shop.show_variant_details === 1,
      maxVisibleVariants: shop.max_visible_variants,
      createdAt: shop.created_at,
      updatedAt: shop.updated_at
      // Removed aiDistributionMode mapping
    };

    console.log(`Mapped shop by ID ${id}:`, mappedShop);

    return mappedShop;
  } catch (error) {
    console.error('Error fetching shop:', error);
    return null;
  }
}

// Get a shop by username
export async function getShopByUsername(username: string): Promise<Shop | null> {
  try {
    // Get database connection
    const db = await getDb();

    const shop = await db.get(`
      SELECT * FROM shops WHERE username = ?
    `, username);

    if (!shop) {
      return null;
    }
    // Map database fields to Shop type
    return {
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
      showVariantDetails: shop.show_variant_details === 1,
      maxVisibleVariants: shop.max_visible_variants,
      createdAt: shop.created_at,
      updatedAt: shop.updated_at
      // Removed aiDistributionMode mapping
    };
  } catch (error) {
    console.error('Error fetching shop:', error);
    return null;
  }
}

// Create a new shop
export async function createShop(shop: Omit<Shop, 'id'>): Promise<Shop> {
  try {
    // Get database connection
    const db = await getDb();

    // Generate a simple ID
    const shopId = `SHP-${Date.now()}`;

    // Log the data we're trying to insert for debugging
    console.log('Attempting to create shop with data:', {
      id: shopId,
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
      showVariantDetails: shop.showVariantDetails,
      maxVisibleVariants: shop.maxVisibleVariants
      // Removed aiDistributionMode from log
    });

    await db.run(`
      INSERT INTO shops (id, username, name, contactPerson, contactPhone, city, exactLocation, tradeLicenseNumber, tinNumber, discount, status, monthlySalesTarget, show_variant_details, max_visible_variants)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, shopId, shop.username, shop.name, shop.contactPerson, shop.contactPhone, shop.city, shop.exactLocation, shop.tradeLicenseNumber, shop.tinNumber, shop.discount, shop.status, shop.monthlySalesTarget, shop.showVariantDetails ? 1 : 0, shop.maxVisibleVariants);

    return {
      id: shopId,
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
      showVariantDetails: shop.showVariantDetails,
      maxVisibleVariants: shop.maxVisibleVariants
      // Removed aiDistributionMode from return
    };
  } catch (error: any) {
    console.error('=== DATABASE ERROR IN CREATE SHOP ===');
    console.error('Error creating shop:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Update a shop
export async function updateShop(id: string, shop: Partial<Shop>): Promise<boolean> {
  let db;
  try {
    console.log(`=== STARTING UPDATE SHOP ${id} ===`);
    console.log(`Update data:`, shop);

    // Get database connection
    console.log('Getting database connection...');
    db = await getDb();
    console.log('Database connection established');
    console.log(`Database connection object:`, typeof db);

    const fields: string[] = [];
    const values: any[] = [];

    if (shop.name !== undefined) {
      fields.push('name = ?');
      values.push(shop.name);
    }
    if (shop.contactPerson !== undefined) {
      fields.push('contactPerson = ?');
      values.push(shop.contactPerson);
    }
    if (shop.contactPhone !== undefined) {
      fields.push('contactPhone = ?');
      values.push(shop.contactPhone);
    }
    if (shop.city !== undefined) {
      fields.push('city = ?');
      values.push(shop.city);
    }
    if (shop.exactLocation !== undefined) {
      fields.push('exactLocation = ?');
      values.push(shop.exactLocation);
    }
    if (shop.tradeLicenseNumber !== undefined) {
      fields.push('tradeLicenseNumber = ?');
      values.push(shop.tradeLicenseNumber);
    }
    if (shop.tinNumber !== undefined) {
      fields.push('tinNumber = ?');
      values.push(shop.tinNumber);
    }
    if (shop.discount !== undefined) {
      fields.push('discount = ?');
      values.push(shop.discount);
    }
    if (shop.status !== undefined) {
      fields.push('status = ?');
      values.push(shop.status);
      console.log(`Adding status update: ${shop.status}`);
    }
    if (shop.monthlySalesTarget !== undefined) {
      fields.push('monthlySalesTarget = ?');
      values.push(shop.monthlySalesTarget);
    }
    if (shop.showVariantDetails !== undefined) {
      fields.push('show_variant_details = ?');
      values.push(shop.showVariantDetails ? 1 : 0);
    }
    if (shop.maxVisibleVariants !== undefined) {
      fields.push('max_visible_variants = ?');
      values.push(shop.maxVisibleVariants);
    }
    // Removed aiDistributionMode update logic

    // Always update the updated_at timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');
    console.log(`Fields to update:`, fields);
    console.log(`Values to update:`, values);

    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE shops SET ${fields.join(', ')} WHERE id = ?`;
      console.log('Executing query:', query);
      console.log('Values:', values);

      try {
        console.log('Running database query...');
        const result = await db.run(query, ...values);
        console.log('Database update result:', result);

        // Check if any rows were affected
        console.log('Update result - changes:', result.changes);
        if (result.changes === 0) {
          console.warn(`No rows were updated for shop ${id}. Shop may not exist or no changes were made.`);
          // Even if no changes were made, we should still return true since the operation was successful
          // The shop data is already as requested
          console.log(`Successfully updated shop ${id} (no changes needed)`);
          // Reset the database cache to ensure subsequent queries get fresh data
          resetDbCache();
          return true;
        }
        console.log(`Successfully updated shop ${id}`);
        // Reset the database cache to ensure subsequent queries get fresh data
        resetDbCache();
        return true;
      } catch (dbError: any) {
        console.error(`Database error when updating shop ${id}:`, dbError);
        console.error(`Database error stack:`, dbError.stack);
        return false;
      }
    } else {
      console.log('No fields to update');
      // If no fields are being updated, we should still return true since the operation was successful
      // The shop data is already as requested
      console.log(`Successfully updated shop ${id} (no fields to update)`);
      // Reset the database cache to ensure subsequent queries get fresh data
      resetDbCache();
      return true;
    }

  } catch (error: any) {
    console.error('Error updating shop:', error);
    console.error('Error stack:', error.stack);
    return false;
  } finally {
    // Close the database connection if needed
    if (db) {
      try {
        // In sqlite library, we don't need to explicitly close connections
        // But we'll add this for future-proofing
        console.log('Database connection managed');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
    console.log(`=== FINISHED UPDATE SHOP ${id} ===`);
  }
}

// Delete a shop
export async function deleteShop(id: string): Promise<boolean> {
  try {
    // Get database connection
    const db = await getDb();

    const result = await db.run(`
      DELETE FROM shops WHERE id = ?
    `, id);
    const deleted = (result.changes || 0) > 0;
    if (deleted) {
      // Reset the database cache to ensure subsequent queries get fresh data
      resetDbCache();
    }
    return deleted;
  } catch (error) {
    console.error('Error deleting shop:', error);
    return false;
  }
}