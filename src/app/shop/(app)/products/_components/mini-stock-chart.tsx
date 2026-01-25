
"use client";

import { useMemo } from "react";
import { Product } from "@/lib/products";
import { ShopInventoryItem } from "@/lib/shop-inventory-sqlite";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MiniStockChartProps {
  product: Product;
  shopInventory: ShopInventoryItem[];
}

export function MiniStockChart({ product, shopInventory }: MiniStockChartProps) {
  const data = useMemo(() => {
    // Group variants by size
    const sizes = Array.from(new Set(product.variants.map(v => v.size))).sort();
    
    return sizes.map(size => {
      // Get all variants for this size
      const variantsForSize = product.variants.filter(v => v.size === size);
      
      // Calculate totals
      const factoryStock = Math.max(0, variantsForSize.reduce((sum, v) => sum + v.stock, 0));
      
      const shopStock = Math.max(0, variantsForSize.reduce((sum, v) => {
        const item = shopInventory.find(i => i.productVariantId === v.id);
        return sum + (item?.stock || 0);
      }, 0));
      
      return { size, factoryStock, shopStock };
    });
  }, [product, shopInventory]);

  const maxVal = Math.max(1, ...data.map(d => Math.max(d.factoryStock, d.shopStock)));

  return (
    <div className="w-full space-y-2 text-[10px]">
        <div className="flex justify-between items-center text-[9px] uppercase tracking-wider font-bold text-muted-foreground/80 px-1 border-b border-border/10 pb-1.5 mb-1">
            <span>Size Breakdown</span>
            <div className="flex gap-3">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span>In Shop</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                    <span>At Factory</span>
                </div>
            </div>
        </div>
      <div className="flex flex-col gap-1.5 w-full max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
        {data.map(d => (
          <div key={d.size} className="flex items-center w-full gap-2 group/row">
            <div className="w-7 text-right font-bold text-foreground/60 shrink-0 group-hover/row:text-foreground transition-colors">{d.size}</div>
            <div className="flex-1 flex flex-col gap-0.5 h-3.5 pt-0.5">
               <div className="w-full bg-muted/20 rounded-sm h-full relative overflow-hidden flex flex-col border border-border/5">
                    {/* Factory Bar (Background) */}
                    <div 
                        className="absolute top-0 left-0 bottom-0 bg-blue-500/40 transition-all duration-500 ease-out"
                        style={{ width: `${(d.factoryStock / maxVal) * 100}%` }}
                    />
                    {/* Shop Bar (Foreground Overlay) */}
                    <div 
                        className="absolute top-0 left-0 bottom-0 bg-green-500/80 transition-all duration-500 ease-out h-[55%] mt-auto"
                        style={{ width: `${(d.shopStock / maxVal) * 100}%` }}
                    />
               </div>
            </div>
            <div className="w-8 text-[9px] text-right text-muted-foreground/50 shrink-0 flex flex-col leading-none font-medium">
                <span className="text-blue-500/70">{d.factoryStock}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
