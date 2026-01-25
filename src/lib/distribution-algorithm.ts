
export interface ShopAllocation {
  shopId: string;
  shopName: string;
  target: number;
  packs: number;
  allocation: number;
  remainder: number;
  isPriority: boolean;
}

export interface DistributionParams {
  totalQuantity: number;
  priorityPercentage: number;
  multiple: number;
  priorityShopIds: string[];
  allShops: { id: string; name: string }[];
}

export function calculateDistribution(params: DistributionParams): ShopAllocation[] {
  const { totalQuantity, priorityPercentage, multiple, priorityShopIds, allShops } = params;
  
  const priorityShops = allShops.filter(s => priorityShopIds.includes(s.id));
  const regularShops = allShops.filter(s => !priorityShopIds.includes(s.id));
  
  const numPriority = priorityShops.length || 1; // Avoid division by zero
  const numRegular = regularShops.length || 1;

  // Phase A: Calculate Targets
  const targetPriorityTotal = totalQuantity * (priorityPercentage / 100);
  const targetRegularTotal = totalQuantity - targetPriorityTotal;
  
  const targetPerPriority = targetPriorityTotal / numPriority;
  const targetPerRegular = targetRegularTotal / numRegular;

  let allocations: ShopAllocation[] = allShops.map(shop => {
    const isPriority = priorityShopIds.includes(shop.id);
    const target = isPriority ? targetPerPriority : targetPerRegular;
    
    // Phase B: Apply Constraints (The "Multiple" Rule)
    const packs = Math.floor(target / multiple);
    const allocation = packs * multiple;
    
    return {
      shopId: shop.id,
      shopName: shop.name,
      target,
      packs,
      allocation,
      remainder: target - allocation,
      isPriority
    };
  });

  // Phase C: Handling the "Leftovers"
  let totalAllocated = allocations.reduce((sum, a) => sum + a.allocation, 0);
  let availableRemainder = totalQuantity - totalAllocated;

  if (availableRemainder >= multiple) {
    // Sort shops by decimal remainder (highest fractional part first)
    // Actually, user said: "Distribute Remainder: Assign 1 additional M unit to shops in order of priority (or highest fractional remainder) until R is exhausted."
    allocations.sort((a, b) => {
      // Priority shops first, then by remainder
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return b.remainder - a.remainder;
    });

    for (let i = 0; i < allocations.length && availableRemainder >= multiple; i++) {
        allocations[i].allocation += multiple;
        allocations[i].packs += 1;
        availableRemainder -= multiple;
    }
  }

  // Final sort to keep it consistent (e.g., by name)
  return allocations.sort((a, b) => a.shopName.localeCompare(b.shopName));
}
