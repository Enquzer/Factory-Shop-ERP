"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProductVariant } from '@/lib/products';
import { OrderItem } from '@/lib/orders';
import { 
  Package, 
  BarChart3, 
  ShoppingCart, 
  TrendingUp, 
  Clock,
  CheckCircle 
} from 'lucide-react';

interface AIDistributionChartProps {
  productVariants: ProductVariant[];
  orderItems: OrderItem[];
  productName: string;
  totalOrderQuantity: number;
}

export function AIDistributionChart({ 
  productVariants, 
  orderItems, 
  productName,
  totalOrderQuantity 
}: AIDistributionChartProps) {
  // Define the type for distribution items
  type DistributionItem = {
    variant: ProductVariant;
    allocated: number;
    percentage: number;
    available: number;
  };

  // Calculate distribution based on available variants and order requirements
  const calculateDistribution = (): DistributionItem[] => {
    if (!productVariants || !Array.isArray(productVariants) || productVariants.length === 0) {
      return [];
    }

    // Calculate total available stock across all variants
    const totalAvailableStock = productVariants.reduce((sum, variant) => sum + (variant?.stock || 0), 0);
    
    // If no stock available, return empty distribution
    if (totalAvailableStock === 0) {
      return productVariants.map(variant => ({
        variant,
        allocated: 0,
        percentage: 0,
        available: variant?.stock || 0
      }));
    }

    // Calculate allocation based on available stock proportions
    return productVariants.map(variant => {
      // Calculate the proportional allocation based on available stock
      const proportion = (variant?.stock || 0) / totalAvailableStock;
      const allocated = Math.floor(totalOrderQuantity * proportion);
      
      // Ensure we don't allocate more than available stock
      const finalAllocation = Math.min(allocated, variant?.stock || 0);
      
      const percentage = totalOrderQuantity > 0 
        ? Math.round((finalAllocation / totalOrderQuantity) * 100) 
        : 0;
      
      return {
        variant,
        allocated: finalAllocation,
        percentage,
        available: variant?.stock || 0
      };
    });
  };

  const distribution = calculateDistribution();

  // Calculate total allocated quantity
  const totalAllocated = Array.isArray(distribution) ? distribution.reduce((sum, item) => sum + item.allocated, 0) : 0;
  const hasShortage = totalOrderQuantity > 0 && totalAllocated < totalOrderQuantity;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          AI Distribution for {productName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI automatically distributes total order quantity across available product variants
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Order Distribution</span>
            <span className="text-sm font-medium">
              {totalAllocated}/{totalOrderQuantity} units allocated
            </span>
          </div>
          <Progress 
            value={totalOrderQuantity > 0 ? (totalAllocated / totalOrderQuantity) * 100 : 0} 
            className="h-2"
          />
          {hasShortage && (
            <div className="mt-2 text-sm text-yellow-600 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>Shortage of {totalOrderQuantity - totalAllocated} units</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {distribution.map((item, index) => (
            <div key={item.variant.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center mr-3">
                  <Package className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <div className="font-medium">
                    {item.variant.color} / {item.variant.size}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Available: {item.available} units
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium">
                  {item.allocated} units
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {distribution.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No variants available for distribution
          </div>
        )}
      </CardContent>
    </Card>
  );
}