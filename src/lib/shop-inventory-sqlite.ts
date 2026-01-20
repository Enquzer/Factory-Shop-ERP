import { getDb, resetDbCache } from './db';
import { ProductVariant } from './products';

export type ShopInventoryItem = {
  id: number;
  shopId: string;
  productId: string;
  productVariantId: string;
  name: string;
  price: number;
  color: string;
  size: string;
  stock: number;
  imageUrl?: string;
};

// Get the entire inventory for a shop
export async function getShopInventory(shopId: string): Promise<ShopInventoryItem[]> {
  try {
    const db = await getDb();
    const items = await db.all(`
      SELECT * FROM shop_inventory WHERE shopId = ?
    `, shopId);
    return items as ShopInventoryItem[];
  } catch (error) {
    console.error('Error fetching shop inventory:', error);
    return [];
  }
}

// Add items to a shop's inventory (transaction handled at API level)
export async function addItemsToShopInventory(shopId: string, items: Omit<ShopInventoryItem, 'id' | 'shopId'>[]): Promise<boolean> {
  try {
    const db = await getDb();
    
    for (const item of items) {
      await db.run(`
        INSERT INTO shop_inventory (shopId, productId, productVariantId, name, price, color, size, stock, imageUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        shopId,
        item.productId,
        item.productVariantId,
        item.name,
        item.price,
        item.color,
        item.size,
        item.stock,
        item.imageUrl || null
      );
    }
    
    // Reset the database cache to ensure subsequent queries get fresh data
    resetDbCache();
    
    return true;
  } catch (error) {
    console.error('Error adding items to shop inventory:', error);
    return false;
  }
}

// Update item stock in a shop's inventory (transaction handled at API level)
export async function updateShopInventoryItemStock(shopId: string, productVariantId: string, newStock: number): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.run(`
      UPDATE shop_inventory 
      SET stock = ? 
      WHERE shopId = ? AND productVariantId = ?
    `, newStock, shopId, productVariantId);
    const updated = (result.changes || 0) > 0;
    if (updated) {
      // Reset the database cache to ensure subsequent queries get fresh data
      resetDbCache();
    }
    return updated;
  } catch (error) {
    console.error('Error updating shop inventory item stock:', error);
    return false;
  }
}

// Remove items from a shop's inventory (transaction handled at API level)
export async function removeItemsFromShopInventory(shopId: string, productVariantIds: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Validate inputs to prevent injection
    if (!shopId || typeof shopId !== 'string') {
      throw new Error('Invalid shopId');
    }
    
    if (!Array.isArray(productVariantIds) || productVariantIds.length === 0) {
      return true; // Nothing to delete
    }
    
    // Validate each productVariantId
    for (const id of productVariantIds) {
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new Error(`Invalid productVariantId: ${id}`);
      }
    }
    
    const placeholders = productVariantIds.map(() => '?').join(',');
    const result = await db.run(`
      DELETE FROM shop_inventory 
      WHERE shopId = ? AND productVariantId IN (${placeholders})
    `, shopId, ...productVariantIds);
    const deleted = (result.changes || 0) > 0;
    if (deleted) {
      // Reset the database cache to ensure subsequent queries get fresh data
      resetDbCache();
    }
    return deleted;
  } catch (error) {
    console.error('Error removing items from shop inventory:', error);
    return false;
  }
}

// Get a specific item from a shop's inventory
export async function getShopInventoryItem(shopId: string, productVariantId: string): Promise<ShopInventoryItem | null> {
  try {
    const db = await getDb();
    const item = await db.get(`
      SELECT * FROM shop_inventory 
      WHERE shopId = ? AND productVariantId = ?
    `, shopId, productVariantId);
    return item as ShopInventoryItem || null;
  } catch (error) {
    console.error('Error fetching shop inventory item:', error);
    return null;
  }
}