
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
  shopScores?: Record<string, number>; // Percentage share (0-100) or raw volume
}

export function calculateDistribution(params: DistributionParams): ShopAllocation[] {
  const { totalQuantity, priorityPercentage, multiple, priorityShopIds, allShops, shopScores } = params;
  
  const priorityShops = allShops.filter(s => priorityShopIds.includes(s.id));
  const regularShops = allShops.filter(s => !priorityShopIds.includes(s.id));
  
  // Phase A: Calculate Targets per Pool
  const targetPriorityTotal = totalQuantity * (priorityPercentage / 100);
  const targetRegularTotal = totalQuantity - targetPriorityTotal;
  
  // Helper to calculate shares within a group
  const calculateGroupShares = (groupShops: { id: string; name: string }[], groupTotal: number) => {
      if (groupShops.length === 0) return {};
      
      // Calculate total score for this group
      // Calculate total score for this group
      let groupScoreSum = 0;
      let nonZeroCount = 0;
      let scoreSumForAvg = 0;

      // First pass: Analyze scores
      groupShops.forEach(s => {
          const raw = shopScores?.[s.id] || 0;
          if (raw > 0) {
              nonZeroCount++;
              scoreSumForAvg += raw;
          }
      });

      const avgScore = nonZeroCount > 0 ? (scoreSumForAvg / nonZeroCount) : 1;

      // Second pass: Calculate adjusted weights (Smoothing + Zero Handling)
      const adjustedScores: Record<string, number> = {};
      let adjustedTotalScore = 0;

      groupShops.forEach(s => {
          let raw = shopScores?.[s.id] || 0;
          
          // Handle "New/No History" shops: Give them the Average score so they aren't penalized
          if (raw === 0) raw = avgScore;

          // Apply Pareto Smoothing (Square Root)
          // This ensures smaller/new shops get a fighting chance against giants
          // e.g. 100 vs 900 (1:9) becomes 10 vs 30 (1:3)
          const smoothed = Math.sqrt(raw);
          
          adjustedScores[s.id] = smoothed;
          adjustedTotalScore += smoothed;
      });

      // Weighted Distribution based on Adjusted Scores
      const map: Record<string, number> = {};
      groupShops.forEach(s => {
          const score = adjustedScores[s.id];
          const share = (score / adjustedTotalScore) * groupTotal;
          map[s.id] = share;
      });
      return map;
  };

  const priorityTargets = calculateGroupShares(priorityShops, targetPriorityTotal);
  const regularTargets = calculateGroupShares(regularShops, targetRegularTotal);

  let allocations: ShopAllocation[] = allShops.map(shop => {
    const isPriority = priorityShopIds.includes(shop.id);
    const target = isPriority ? (priorityTargets[shop.id] || 0) : (regularTargets[shop.id] || 0);
    
    // Phase B: Apply Constraints (The "Multiple" Rule)
    // We floor to multiple. This might leave a lot of remainder.
    const packs = Math.floor(target / multiple);
    const allocation = packs * multiple;
    
    return {
      shopId: shop.id,
      shopName: shop.name,
      target,
      packs,
      allocation,
      remainder: target - allocation, // The "Unsatisfied" need
      isPriority
    };
  });

  // Phase C: Handling the "Leftovers" logic
  // Now we distribute the remainder.
  // We should favor shops that have the highest 'remainder' (i.e. closest to earning another pack)
  // regardless of priority, because the priority bias was already applied in Phase A.
  // OR, we stick to priority first. The user prompt was vague, but "Fair Allocation" usually means minimizing the deficit (remainder).
  
  let totalAllocated = allocations.reduce((sum, a) => sum + a.allocation, 0);
  let availableRemainder = totalQuantity - totalAllocated;

  if (availableRemainder >= multiple) {
    // Sort by Priority first, then by largest remainder
    allocations.sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return b.remainder - a.remainder;
    });

    for (let i = 0; i < allocations.length && availableRemainder >= multiple; i++) {
        allocations[i].allocation += multiple;
        allocations[i].packs += 1;
        allocations[i].remainder -= multiple; // Theoretically fits better
        availableRemainder -= multiple;
    }
  }

  // Final sort by Name for display
  return allocations.sort((a, b) => a.shopName.localeCompare(b.shopName));
}
