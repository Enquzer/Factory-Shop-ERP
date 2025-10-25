"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, MapPin } from "lucide-react";
import { useMemo } from "react";
import type { Shop } from "@/lib/shops";

interface ShopsDashboardProps {
  shops: Shop[];
}

export function ShopsDashboard({ shops }: ShopsDashboardProps) {
  const dashboardMetrics = useMemo(() => {
    const totalShops = shops.length;
    const activeShops = shops.filter(shop => shop.status === 'Active').length;
    const inactiveShops = shops.filter(shop => shop.status === 'Inactive').length;
    const cities = new Set(shops.map(shop => shop.city)).size;
    
    return {
      totalShops,
      activeShops,
      inactiveShops,
      cities
    };
  }, [shops]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.totalShops}</div>
          <p className="text-xs text-muted-foreground">Registered shops</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Shops</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.activeShops}</div>
          <p className="text-xs text-muted-foreground">Currently operating</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inactive Shops</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.inactiveShops}</div>
          <p className="text-xs text-muted-foreground">Temporarily closed</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cities</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dashboardMetrics.cities}</div>
          <p className="text-xs text-muted-foreground">Locations covered</p>
        </CardContent>
      </Card>
    </div>
  );
}