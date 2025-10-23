import { getDb } from './db';

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
    
    return { shops, totalCount };
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
    return shops;
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
    return shop || null;
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
    return shop || null;
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
    
    await db.run(`
      INSERT INTO shops (id, username, name, contactPerson, contactPhone, city, exactLocation, tradeLicenseNumber, tinNumber, discount, status, monthlySalesTarget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, shopId, shop.username, shop.name, shop.contactPerson, shop.contactPhone, shop.city, shop.exactLocation, shop.tradeLicenseNumber, shop.tinNumber, shop.discount, shop.status, shop.monthlySalesTarget);

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
      monthlySalesTarget: shop.monthlySalesTarget
    };
  } catch (error) {
    console.error('Error creating shop:', error);
    throw error;
  }
}

// Update a shop
export async function updateShop(id: string, shop: Partial<Shop>): Promise<boolean> {
  try {
    // Get database connection
    const db = await getDb();
    
    const fields = [];
    const values = [];
    
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
    }
    if (shop.monthlySalesTarget !== undefined) {
      fields.push('monthlySalesTarget = ?');
      values.push(shop.monthlySalesTarget);
    }
    
    if (fields.length > 0) {
      values.push(id);
      await db.run(`
        UPDATE shops SET ${fields.join(', ')} WHERE id = ?
      `, ...values);
    }

    return true;
  } catch (error) {
    console.error('Error updating shop:', error);
    return false;
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
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error deleting shop:', error);
    return false;
  }
}