import { ProductVariant } from './products';

export type DistributionMode = 'proportional' | 'equal' | 'manual_override';

/**
 * Distribute order quantity across variants based on the specified mode
 * @param variants Available product variants with their current stock
 * @param orderQty Total quantity ordered by the shop
 * @param mode Distribution mode
 * @returns Map of variant IDs to allocated quantities
 */
export function distributeOrderQuantity(
  variants: ProductVariant[],
  orderQty: number,
  mode: DistributionMode
): Map<string, number> {
  const distribution = new Map<string, number>();
  
  // If no variants or order quantity is 0, return empty distribution
  if (variants.length === 0 || orderQty <= 0) {
    return distribution;
  }
  
  switch (mode) {
    case 'proportional':
      return distributeProportionally(variants, orderQty);
      
    case 'equal':
      return distributeEqually(variants, orderQty);
      
    case 'manual_override':
      // For manual override, we distribute proportionally as default
      // In a real implementation, this would allow manual specification
      return distributeProportionally(variants, orderQty);
      
    default:
      // Default to proportional distribution
      return distributeProportionally(variants, orderQty);
  }
}

/**
 * Distribute order quantity proportionally based on current stock levels
 * @param variants Available product variants with their current stock
 * @param orderQty Total quantity ordered by the shop
 * @returns Map of variant IDs to allocated quantities
 */
function distributeProportionally(
  variants: ProductVariant[],
  orderQty: number
): Map<string, number> {
  const distribution = new Map<string, number>();
  
  // Calculate total available stock (treat negative stock as 0)
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
  
  // If no stock available, distribute 0 to all variants
  if (totalStock === 0) {
    variants.forEach(variant => distribution.set(variant.id, 0));
    return distribution;
  }
  
  // Distribute proportionally
  let allocatedTotal = 0;
  
  // First pass: distribute based on ratio
  variants.forEach(variant => {
    const safeStock = Math.max(0, variant.stock);
    const ratio = safeStock / totalStock;
    const allocated = Math.floor(orderQty * ratio);
    distribution.set(variant.id, allocated);
    allocatedTotal += allocated;
  });
  
  // Second pass: distribute remainder to variants with highest fractional parts
  const remainder = orderQty - allocatedTotal;
  if (remainder > 0) {
    // Calculate fractional parts for each variant
    const fractionalParts = variants.map(variant => {
      const safeStock = Math.max(0, variant.stock);
      const ratio = safeStock / totalStock;
      const allocated = orderQty * ratio;
      return {
        variantId: variant.id,
        fractionalPart: allocated - Math.floor(allocated)
      };
    });
    
    // Sort by fractional part (descending) and distribute remainder
    fractionalParts
      .sort((a, b) => b.fractionalPart - a.fractionalPart)
      .slice(0, remainder)
      .forEach(({ variantId }) => {
        const current = distribution.get(variantId) || 0;
        distribution.set(variantId, current + 1);
      });
  }
  
  return distribution;
}

/**
 * Distribute order quantity equally across all variants
 * @param variants Available product variants
 * @param orderQty Total quantity ordered by the shop
 * @returns Map of variant IDs to allocated quantities
 */
function distributeEqually(
  variants: ProductVariant[],
  orderQty: number
): Map<string, number> {
  const distribution = new Map<string, number>();
  
  // Calculate equal distribution
  const equalShare = Math.floor(orderQty / variants.length);
  const remainder = orderQty % variants.length;
  
  // Distribute equal shares
  variants.forEach((variant, index) => {
    // Give one extra to the first 'remainder' variants
    const allocated = equalShare + (index < remainder ? 1 : 0);
    distribution.set(variant.id, allocated);
  });
  
  return distribution;
}

/**
 * Validate that the distribution doesn't exceed available stock
 * @param variants Available product variants with their current stock
 * @param distribution Map of variant IDs to allocated quantities
 * @returns True if distribution is valid, false otherwise
 */
export function validateDistribution(
  variants: ProductVariant[],
  distribution: Map<string, number>
): boolean {
  for (const [variantId, allocatedQty] of distribution) {
    const variant = variants.find(v => v.id === variantId);
    if (!variant || allocatedQty > Math.max(0, variant.stock)) {
      return false;
    }
  }
  return true;
}