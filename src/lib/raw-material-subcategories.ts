import { getDB, resetDbCache } from './db';

export type RawMaterialSubcategory = {
  id: number;
  category: string;
  subcategory: string;
  code: string;
  createdAt?: Date;
};

// --- Raw Material Subcategories CRUD ---

export async function getRawMaterialSubcategories(): Promise<RawMaterialSubcategory[]> {
  try {
    const db = await getDB();
    const subcategories = await db.all('SELECT * FROM raw_material_subcategories ORDER BY category, subcategory ASC');
    return subcategories.map((s: any) => ({
      ...s,
      createdAt: new Date(s.created_at)
    }));
  } catch (error) {
    console.error('Error fetching raw material subcategories:', error);
    return [];
  }
}

export async function getRawMaterialSubcategoriesByCategory(category: string): Promise<RawMaterialSubcategory[]> {
  try {
    const db = await getDB();
    const subcategories = await db.all(
      'SELECT * FROM raw_material_subcategories WHERE category = ? ORDER BY subcategory ASC',
      [category]
    );
    return subcategories.map((s: any) => ({
      ...s,
      createdAt: new Date(s.created_at)
    }));
  } catch (error) {
    console.error('Error fetching raw material subcategories by category:', error);
    return [];
  }
}

export async function addRawMaterialSubcategory(
  category: string,
  subcategory: string,
  code: string
): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(
      'INSERT INTO raw_material_subcategories (category, subcategory, code) VALUES (?, ?, ?)',
      [category, subcategory, code]
    );
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error adding raw material subcategory:', error);
    return false;
  }
}

export async function updateRawMaterialSubcategory(
  id: number,
  category: string,
  subcategory: string,
  code: string
): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run(
      'UPDATE raw_material_subcategories SET category = ?, subcategory = ?, code = ? WHERE id = ?',
      [category, subcategory, code, id]
    );
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error updating raw material subcategory:', error);
    return false;
  }
}

export async function deleteRawMaterialSubcategory(id: number): Promise<boolean> {
  try {
    const db = await getDB();
    await db.run('DELETE FROM raw_material_subcategories WHERE id = ?', [id]);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error deleting raw material subcategory:', error);
    return false;
  }
}

// --- Helper Functions ---

export function getSubcategoryCode(subcategory: string): string {
  // Take first 2 letters and capitalize
  return subcategory.substring(0, 2).toUpperCase();
}

export function generateRawMaterialId(category: string, subcategory: string, sequence: number): string {
  const catCode = category.substring(0, 2).toUpperCase();
  const subCode = getSubcategoryCode(subcategory);
  const sequenceStr = sequence.toString().padStart(2, '0');
  return `RW-${catCode}-${subCode}-${sequenceStr}`;
}

// Get next sequence number for a category-subcategory combination
export async function getNextSequenceForSubcategory(category: string, subcategory: string): Promise<number> {
  try {
    const db = await getDB();
    const catCode = category.substring(0, 2).toUpperCase();
    const subCode = getSubcategoryCode(subcategory);
    
    // Find the highest existing sequence for this category-subcategory combination
    const result = await db.get(`
      SELECT id FROM raw_materials 
      WHERE id LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `, [`RW-${catCode}-${subCode}-%`]);
    
    if (result) {
      // Extract sequence number from the ID (last 2 digits)
      const parts = result.id.split('-');
      if (parts.length === 4) {
        const sequence = parseInt(parts[3], 10);
        return sequence + 1;
      }
    }
    
    return 1; // Start from 1 if no existing materials
  } catch (error) {
    console.error('Error getting next sequence:', error);
    return 1;
  }
}