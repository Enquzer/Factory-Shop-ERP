"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, CheckCircle, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { Order } from "@/lib/orders";

interface OrdersDashboardProps {
  orders: Order[];
}

export function OrdersDashboard({ orders }: OrdersDashboardProps) {
  const dashboardMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => 
      order.status === 'Pending' || order.status === 'Awaiting Payment'
    ).length;
    const completedOrders = orders.filter(order => order.status === 'Delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    
    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue
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
          <p className="text-xs text-muted-foreground">All orders</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.pendingOrders}</div>
          <p className="text-xs text-muted-foreground">Orders in progress</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.completedOrders}</div>
          <p className="text-xs text-muted-foreground">Delivered orders</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">ETB {dashboardMetrics.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Total sales value</p>
        </CardContent>
      </Card>
    </div>
  );
}