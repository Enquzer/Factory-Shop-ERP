import { getDb } from './db';
import { HolidayDiscount, ProductHolidayDiscount, CreateHolidayDiscountInput, UpdateHolidayDiscountInput, ApplyHolidayDiscountInput } from './holiday-discounts';

// Get all holiday discounts
export async function getHolidayDiscounts(): Promise<HolidayDiscount[]> {
  try {
    const db = await getDb();
    const discounts = await db.all(`
      SELECT 
        id,
        name,
        description,
        startDate,
        endDate,
        discountPercentage,
        isActive,
        createdAt,
        updatedAt
      FROM holiday_discounts
      ORDER BY createdAt DESC
    `) as any[];

    return discounts.map(discount => ({
      ...discount,
      startDate: new Date(discount.startDate),
      endDate: new Date(discount.endDate),
      isActive: Boolean(discount.isActive),
      createdAt: new Date(discount.createdAt),
      updatedAt: new Date(discount.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching holiday discounts:', error);
    return [];
  }
}

// Get a specific holiday discount by ID
export async function getHolidayDiscountById(id: string): Promise<HolidayDiscount | null> {
  try {
    const db = await getDb();
    const discount = await db.get(`
      SELECT 
        id,
        name,
        description,
        startDate,
        endDate,
        discountPercentage,
        isActive,
        createdAt,
        updatedAt
      FROM holiday_discounts
      WHERE id = ?
    `, id) as any;

    if (!discount) {
      return null;
    }

    return {
      ...discount,
      startDate: new Date(discount.startDate),
      endDate: new Date(discount.endDate),
      isActive: Boolean(discount.isActive),
      createdAt: new Date(discount.createdAt),
      updatedAt: new Date(discount.updatedAt)
    };
  } catch (error) {
    console.error('Error fetching holiday discount:', error);
    return null;
  }
}

// Create a new holiday discount
export async function createHolidayDiscount(discount: CreateHolidayDiscountInput): Promise<HolidayDiscount | null> {
  try {
    const db = await getDb();
    const id = `hd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate dates
    const startDate = new Date(discount.startDate);
    const endDate = new Date(discount.endDate);
    
    if (startDate > endDate) {
      throw new Error('End date must be after start date');
    }

    const result = await db.run(`
      INSERT INTO holiday_discounts (
        id, 
        name, 
        description, 
        startDate, 
        endDate, 
        discountPercentage, 
        isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, 
      id,
      discount.name,
      discount.description || null,
      discount.startDate,
      discount.endDate,
      discount.discountPercentage,
      1 // isActive by default
    );

    if (result.changes > 0) {
      return {
        id,
        name: discount.name,
        description: discount.description || undefined,
        startDate: new Date(discount.startDate),
        endDate: new Date(discount.endDate),
        discountPercentage: discount.discountPercentage,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return null;
  } catch (error) {
    console.error('Error creating holiday discount:', error);
    throw error;
  }
}

// Update a holiday discount
export async function updateHolidayDiscount(discount: UpdateHolidayDiscountInput): Promise<HolidayDiscount | null> {
  try {
    const db = await getDb();
    
    // Get current discount to validate dates
    const currentDiscount = await getHolidayDiscountById(discount.id);
    if (!currentDiscount) {
      throw new Error('Holiday discount not found');
    }

    // Prepare update fields
    const fields: string[] = [];
    const values: any[] = [];
    
    if (discount.name !== undefined) {
      fields.push('name = ?');
      values.push(discount.name);
    }
    
    if (discount.description !== undefined) {
      fields.push('description = ?');
      values.push(discount.description || null);
    }
    
    if (discount.startDate !== undefined) {
      const startDate = new Date(discount.startDate);
      fields.push('startDate = ?');
      values.push(startDate);
    }
    
    if (discount.endDate !== undefined) {
      const endDate = new Date(discount.endDate);
      fields.push('endDate = ?');
      values.push(endDate);
    }
    
    if (discount.discountPercentage !== undefined) {
      fields.push('discountPercentage = ?');
      values.push(discount.discountPercentage);
    }
    
    if (discount.isActive !== undefined) {
      fields.push('isActive = ?');
      values.push(discount.isActive ? 1 : 0);
    }
    
    // Always update updatedAt
    fields.push('updatedAt = ?');
    values.push(new Date());
    
    // Add ID for WHERE clause
    values.push(discount.id);

    if (fields.length > 1) { // More than just updatedAt
      const query = `UPDATE holiday_discounts SET ${fields.join(', ')} WHERE id = ?`;
      await db.run(query, ...values);
    }

    // Return updated discount
    return await getHolidayDiscountById(discount.id);
  } catch (error) {
    console.error('Error updating holiday discount:', error);
    throw error;
  }
}

// Delete a holiday discount
export async function deleteHolidayDiscount(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Delete associated product holiday discounts first
    await db.run('DELETE FROM product_holiday_discounts WHERE holidayDiscountId = ?', id);
    
    // Then delete the holiday discount
    const result = await db.run('DELETE FROM holiday_discounts WHERE id = ?', id);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting holiday discount:', error);
    throw error;
  }
}

// Get products associated with a holiday discount
export async function getProductsForHolidayDiscount(holidayDiscountId: string): Promise<ProductHolidayDiscount[]> {
  try {
    const db = await getDb();
    const products = await db.all(`
      SELECT id, productId, holidayDiscountId
      FROM product_holiday_discounts
      WHERE holidayDiscountId = ?
    `, holidayDiscountId) as ProductHolidayDiscount[];

    return products;
  } catch (error) {
    console.error('Error fetching products for holiday discount:', error);
    return [];
  }
}

// Apply holiday discount to products
export async function applyHolidayDiscountToProducts(input: ApplyHolidayDiscountInput): Promise<boolean> {
  try {
    const db = await getDb();
    
    // First, remove all existing associations for this discount
    await db.run('DELETE FROM product_holiday_discounts WHERE holidayDiscountId = ?', input.holidayDiscountId);
    
    // Then add the new associations
    for (const productId of input.productIds) {
      await db.run(`
        INSERT OR IGNORE INTO product_holiday_discounts (productId, holidayDiscountId)
        VALUES (?, ?)
      `, productId, input.holidayDiscountId);
    }
    
    return true;
  } catch (error) {
    console.error('Error applying holiday discount to products:', error);
    throw error;
  }
}

// Remove holiday discount from products
export async function removeHolidayDiscountFromProducts(holidayDiscountId: string, productIds?: string[]): Promise<boolean> {
  try {
    const db = await getDb();
    
    if (productIds && productIds.length > 0) {
      // Remove specific products from the discount
      for (const productId of productIds) {
        await db.run(`
          DELETE FROM product_holiday_discounts 
          WHERE holidayDiscountId = ? AND productId = ?
        `, holidayDiscountId, productId);
      }
    } else {
      // Remove all products from the discount
      await db.run('DELETE FROM product_holiday_discounts WHERE holidayDiscountId = ?', holidayDiscountId);
    }
    
    return true;
  } catch (error) {
    console.error('Error removing holiday discount from products:', error);
    throw error;
  }
}

// Get active holiday discounts for a specific date
export async function getActiveHolidayDiscounts(date: Date = new Date()): Promise<HolidayDiscount[]> {
  try {
    const db = await getDb();
    const discounts = await db.all(`
      SELECT 
        id,
        name,
        description,
        startDate,
        endDate,
        discountPercentage,
        isActive
      FROM holiday_discounts
      WHERE isActive = 1
        AND ? BETWEEN startDate AND endDate
      ORDER BY createdAt DESC
    `, date.toISOString()) as any[];

    return discounts.map(discount => ({
      ...discount,
      startDate: new Date(discount.startDate),
      endDate: new Date(discount.endDate),
      isActive: Boolean(discount.isActive)
    }));
  } catch (error) {
    console.error('Error fetching active holiday discounts:', error);
    return [];
  }
}

// Get holiday discounts for a specific product
export async function getHolidayDiscountsForProduct(productId: string): Promise<HolidayDiscount[]> {
  try {
    const db = await getDb();
    const discounts = await db.all(`
      SELECT 
        hd.id,
        hd.name,
        hd.description,
        hd.startDate,
        hd.endDate,
        hd.discountPercentage,
        hd.isActive,
        hd.createdAt,
        hd.updatedAt
      FROM holiday_discounts hd
      JOIN product_holiday_discounts phd ON hd.id = phd.holidayDiscountId
      WHERE phd.productId = ?
        AND hd.isActive = 1
        AND ? BETWEEN hd.startDate AND hd.endDate
      ORDER BY hd.createdAt DESC
    `, productId, new Date().toISOString()) as any[];

    return discounts.map(discount => ({
      ...discount,
      startDate: new Date(discount.startDate),
      endDate: new Date(discount.endDate),
      isActive: Boolean(discount.isActive),
      createdAt: new Date(discount.createdAt),
      updatedAt: new Date(discount.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching holiday discounts for product:', error);
    return [];
  }
}