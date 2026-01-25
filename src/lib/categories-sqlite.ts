
import { getDb, resetDbCache } from './db';

export type MainCategory = {
  id: number;
  name: string;
  code: string;
};

export type ProductCategory = {
  id: number;
  name: string;
  code: string;
};

// --- Main Categories CRUD ---

export async function getMainCategories(): Promise<MainCategory[]> {
  try {
    const db = await getDb();
    return db.all('SELECT * FROM main_categories ORDER BY name ASC');
  } catch (error) {
    console.error('Error fetching main categories:', error);
    return [];
  }
}

export async function addMainCategory(name: string, code: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('INSERT INTO main_categories (name, code) VALUES (?, ?)', [name, code]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error adding main category:', error);
    return false;
  }
}

export async function updateMainCategory(id: number, name: string, code: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('UPDATE main_categories SET name = ?, code = ? WHERE id = ?', [name, code, id]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error updating main category:', error);
    return false;
  }
}

export async function deleteMainCategory(id: number): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('DELETE FROM main_categories WHERE id = ?', [id]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error deleting main category:', error);
    return false;
  }
}

// --- Product Categories CRUD ---

export async function getProductCategories(): Promise<ProductCategory[]> {
  try {
    const db = await getDb();
    return db.all('SELECT * FROM product_categories ORDER BY name ASC');
  } catch (error) {
    console.error('Error fetching product categories:', error);
    return [];
  }
}

export async function addProductCategory(name: string, code: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('INSERT INTO product_categories (name, code) VALUES (?, ?)', [name, code]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error adding product category:', error);
    return false;
  }
}

export async function updateProductCategory(id: number, name: string, code: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('UPDATE product_categories SET name = ?, code = ? WHERE id = ?', [name, code, id]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error updating product category:', error);
    return false;
  }
}

export async function deleteProductCategory(id: number): Promise<boolean> {
  try {
    const db = await getDb();
    await db.run('DELETE FROM product_categories WHERE id = ?', [id]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error deleting product category:', error);
    return false;
  }
}

// --- Code Generation Logic ---

/**
 * Generates the next sequential style number/product code.
 * Format: [MainCode]-[SubCode]-[3DigitSequence]
 */
export async function getNextSequentialCode(mainCode: string, subCode: string): Promise<string> {
  try {
    const db = await getDb();
    const prefix = `${mainCode}-${subCode}-`;
    
    // We need to check both styles and products to ensure global uniqueness across the system
    // assuming style numbers and product codes share the same pool or need to be consistent.
    
    const styleNumbers = await db.all(`SELECT number as code FROM styles WHERE number LIKE ?`, [`${prefix}%`]);
    const productCodes = await db.all(`SELECT productCode as code FROM products WHERE productCode LIKE ?`, [`${prefix}%`]);
    
    const allCodes = [...styleNumbers, ...productCodes];
    
    let maxSeq = 0;
    allCodes.forEach((entry: any) => {
      // entry.code example: CL-DR-001 or CL-DR-001/A
      const parts = entry.code.split('-');
      if (parts.length >= 3) {
        // Look at the 3rd part, and split by / if it exists
        const seqPart = parts[2].split('/')[0];
        const seqNum = parseInt(seqPart);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });

    const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `${prefix}${nextSeq}`;
  } catch (error) {
    console.error('Error generating next sequential code:', error);
    return `${mainCode}-${subCode}-001`; // Fallback
  }
}
