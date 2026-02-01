import { getDb } from '@/lib/db';

export interface Pattern {
  id?: number;
  name: string;
  version: number;
  parentPatternId?: number;
  data: string; // JSON string of the pattern data
  createdAt?: string;
}

/**
 * Checks if a pattern is currently used in any active production order.
 * @param patternId The ID of the pattern to check.
 */
export async function isPatternInActiveProduction(patternId: number): Promise<boolean> {
  const db = await getDb();
  // Assuming 'orders' table has 'status' and some link to patterns.
  // Since the schema for linking patterns to orders isn't fully defined yet,
  // we will assume a 'pattern_usage' table or direct link in 'production_ledger' or 'marketing_orders'.
  
  // For now, let's assume we will add a 'patternId' to 'marketing_orders' or similar.
  // Or check against 'production_ledger' if we track pattern IDs there.
  
  // Placeholder query:
  // SELECT count(*) FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE oi.pattern_id = ? AND o.status IN ('Production', 'Cutting', 'Sewing')
  
  // Since we don't have the exact link yet, we will return false but log a warning to implement this.
  console.warn('isPatternInActiveProduction check is currently a placeholder.');
  return false; 
}

/**
 * Saves a pattern. If it's in use, it creates a new version.
 */
export async function savePattern(pattern: Pattern): Promise<number> {
  const db = await getDb();
  
  if (pattern.id) {
    const inUse = await isPatternInActiveProduction(pattern.id);
    if (inUse) {
      // Create new version
      const newVersion = pattern.version + 1;
      const result = await db.run(
        `INSERT INTO patterns (name, version, parent_pattern_id, data) VALUES (?, ?, ?, ?)`,
        [pattern.name, newVersion, pattern.id, pattern.data]
      );
      return result.lastID;
    } else {
      // Update existing
      await db.run(
        `UPDATE patterns SET data = ?, version = ? WHERE id = ?`,
        [pattern.data, pattern.version, pattern.id]
      );
      return pattern.id;
    }
  } else {
    // New pattern
    const result = await db.run(
      `INSERT INTO patterns (name, version, data) VALUES (?, 1, ?)`,
      [pattern.name, pattern.data]
    );
    return result.lastID;
  }
}
