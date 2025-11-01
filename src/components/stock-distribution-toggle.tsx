"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StockDistributionChart } from "@/components/stock-distribution-chart";
import { Product } from "@/lib/products";
import { ShopInventoryItem } from "@/lib/shop-inventory-sqlite";
import { BarChart3 } from "lucide-react";

interface StockDistributionToggleProps {
  product: Product;
  shopInventory?: ShopInventoryItem[];
  viewType: "factory" | "shop";
  className?: string;
}

export function StockDistributionToggle({ 
  product, 
  shopInventory = [], 
  viewType,
  className 
}: StockDistributionToggleProps) {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div className={className}>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setShowChart(!showChart)}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        {showChart ? "Hide Stock Distribution" : "Show Stock Distribution"}
      </Button>
      
      {showChart && (
        <div className="mt-4">
          <StockDistributionChart 
            product={product}
            shopInventory={shopInventory}
            viewType={viewType}
          />
        </div>
      )}
    </div>
  );
}