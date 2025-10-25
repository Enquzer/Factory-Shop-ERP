"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle, TrendingUp, Calendar } from "lucide-react";
import { useMemo } from "react";
import type { MarketingOrder } from "@/lib/marketing-orders";

interface MarketingOrdersDashboardProps {
  orders: MarketingOrder[];
}

export function MarketingOrdersDashboard({ orders }: MarketingOrdersDashboardProps) {
  const dashboardMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.isCompleted).length;
    const inProgressOrders = orders.filter(order => !order.isCompleted).length;
    const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);
    
    return {
      totalOrders,
      completedOrders,
      inProgressOrders,
      totalQuantity
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.totalOrders}</div>
          <p className="text-xs text-muted-foreground">All marketing orders</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.completedOrders}</div>
          <p className="text-xs text-muted-foreground">Finished production</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.inProgressOrders}</div>
          <p className="text-xs text-muted-foreground">Orders in production</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.totalQuantity.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Items to produce</p>
        </CardContent>
      </Card>
    </div>
  );
}