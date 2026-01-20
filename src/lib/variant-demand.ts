import { getDb } from './db';

// Record variant demand when an order is placed
export async function recordVariantDemand(variantId: string, productId: string, shopId: string, quantity: number) {
  try {
    const db = await getDb();
    
    await db.run(`
      INSERT INTO variant_demand_history (variantId, productId, shopId, quantity, orderDate)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, variantId, productId, shopId, quantity);
    
    console.log(`Recorded variant demand: variantId=${variantId}, productId=${productId}, shopId=${shopId}, quantity=${quantity}`);
  } catch (error) {
    console.error('Error recording variant demand:', error);
  }
}

// Calculate demand weights for variants of a product based on historical data
export async function calculateDemandWeights(productId: string, shopId?: string, daysBack: number = 30) {
  try {
    const db = await getDb();
    
    // Query to get total quantities ordered for each variant in the specified time period
    let query = `
      SELECT 
        variantId,
        SUM(quantity) as totalQuantity
      FROM variant_demand_history
      WHERE productId = ?
        AND orderDate >= datetime('now', '-${daysBack} days')
    `;
    
    const params: any[] = [productId];
    
    // If shopId is provided, filter by specific shop
    if (shopId) {
      query += ` AND shopId = ?`;
      params.push(shopId);
    }
    
    query += ` GROUP BY variantId ORDER BY totalQuantity DESC`;
    
    const results: Array<{ variantId: string; totalQuantity: number }> = await db.all(query, ...params);
    
    // Calculate weights based on demand
    if (results.length === 0) {
      // If no historical data, return equal weights
      return new Map<string, number>();
    }
    
    // Calculate total quantity across all variants
    const totalQuantity = results.reduce((sum: number, row: { totalQuantity: number }) => sum + row.totalQuantity, 0);
    
    // Create map of variantId to demand weight (0-1 scale)
    const weights = new Map<string, number>();
    results.forEach((row: { variantId: string; totalQuantity: number }) => {
      weights.set(row.variantId, row.totalQuantity / totalQuantity);
    });
    
    return weights;
  } catch (error) {
    console.error('Error calculating demand weights:', error);
    return new Map<string, number>(); // Return empty map on error
  }
}

// Get total historical demand for a specific variant
export async function getVariantDemand(variantId: string, daysBack: number = 30) {
  try {
    const db = await getDb();
    
    const result: { totalQuantity: number } | undefined = await db.get(`
      SELECT SUM(quantity) as totalQuantity
      FROM variant_demand_history
      WHERE variantId = ?
        AND orderDate >= datetime('now', '-${daysBack} days')
    `, variantId);
    
    return result?.totalQuantity || 0;
  } catch (error) {
    console.error('Error getting variant demand:', error);
    return 0;
  }
}

// Get demand history for analysis
export async function getDemandHistory(productId: string, shopId?: string, daysBack: number = 30) {
  try {
    const db = await getDb();
    
    let query = `
      SELECT 
        variantId,
        SUM(quantity) as totalQuantity,
        COUNT(*) as orderCount
      FROM variant_demand_history
      WHERE productId = ?
        AND orderDate >= datetime('now', '-${daysBack} days')
    `;
    
    const params: any[] = [productId];
    
    if (shopId) {
      query += ` AND shopId = ?`;
      params.push(shopId);
    }
    
    query += ` GROUP BY variantId ORDER BY totalQuantity DESC`;
    
    return await db.all(query, ...params);
  } catch (error) {
    console.error('Error getting demand history:', error);
    return [];
  }
}