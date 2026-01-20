"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Product } from '@/lib/products';
import { Shop } from '@/lib/shops';
import { 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  Store, 
  AlertTriangle, 
  CheckCircle, 
  PackagePlus,
  PackageMinus
} from 'lucide-react';

interface InventoryMetricsProps {
  products: Product[];
  shops: Shop[];
}

export function InventoryMetrics({ products, shops }: InventoryMetricsProps) {
  // Calculate inventory metrics
  const totalProducts = Array.isArray(products) ? products.length : 0;
  const totalVariants = Array.isArray(products) ? products.reduce((sum, product) => sum + product.variants.length, 0) : 0;
  const totalStock = Array.isArray(products) ? products.reduce((sum, product) => {
    return sum + product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0);
  }, 0) : 0;
  
  // Count products with low stock
  const lowStockProducts = Array.isArray(products) ? products.filter(product => {
    return product.variants.some(variant => variant.stock <= product.minimumStockLevel);
  }).length : 0;
  
  // Count shops
  const totalShops = Array.isArray(shops) ? shops.length : 0;
  const activeShops = Array.isArray(shops) ? shops.filter(shop => shop.status === 'Active').length : 0;
  
  // Calculate average stock per product
  const avgStockPerProduct = totalProducts > 0 ? Math.round(totalStock / totalProducts) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">Active products in catalog</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          <PackagePlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStock}</div>
          <p className="text-xs text-muted-foreground">Units in factory inventory</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{lowStockProducts}</div>
          <p className="text-xs text-muted-foreground">Products below minimum level</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Active Shops</CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeShops}/{totalShops}</div>
          <div className="mt-2">
            <Progress value={(activeShops / totalShops) * 100} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Active shops connected</p>
        </CardContent>
      </Card>
    </div>
  );
}