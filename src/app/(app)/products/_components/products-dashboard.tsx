"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tag, Wallet, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { Product } from "@/lib/products";

interface ProductsDashboardProps {
  products: Product[];
}

export function ProductsDashboard({ products }: ProductsDashboardProps) {
  const dashboardMetrics = useMemo(() => {
    const totalProducts = products.length;
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
    const totalValue = products.reduce(
      (sum, product) => 
        sum + (product.price * product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0)),
      0
    );
    const lowStockItems = products.filter(product => {
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      return totalStock < (product.minimumStockLevel || 10);
    }).length;
    
    return {
      totalProducts,
      totalVariants,
      totalValue,
      lowStockItems
    };
  }, [products]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.totalProducts}</div>
          <p className="text-xs text-muted-foreground">Registered products</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
          <Tag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.totalVariants}</div>
          <p className="text-xs text-muted-foreground">Product variants</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">ETB {dashboardMetrics.totalValue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Inventory value in Birr</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.lowStockItems}</div>
          <p className="text-xs text-muted-foreground">Items below minimum stock</p>
        </CardContent>
      </Card>
    </div>
  );
}