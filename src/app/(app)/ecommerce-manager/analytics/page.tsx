"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingBag,
  Truck,
  Building2,
  Calendar,
  RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function EcommerceAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchShops();
      fetchAnalytics();
    }
  }, [selectedShop, token]);

  const fetchShops = async () => {
    try {
      const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/shops?limit=0', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        // The API returns an array directly when limit=0
        setShops(Array.isArray(data) ? data : (data.shops || []));
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const url = selectedShop === "all" 
        ? '/api/ecommerce-manager/analytics' 
        : `/api/ecommerce-manager/analytics?shopId=${selectedShop}`;
      
      const res = await fetch(url, { headers: authHeaders });
      if (res.ok) {
        const { analytics: data } = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare data for the status pie chart
  const statusData = analytics ? [
    { name: 'Pending', value: analytics.pendingOrders || 0, color: '#f59e0b' },
    { name: 'Processing', value: analytics.processingOrders || 0, color: '#a855f7' },
    { name: 'Shipped', value: analytics.shippedOrders || 0, color: '#6366f1' },
    { name: 'Delivered', value: analytics.deliveredOrders || 0, color: '#22c55e' },
    { name: 'Cancelled', value: analytics.cancelledOrders || 0, color: '#ef4444' },
  ].filter(item => item.value > 0) : [];

  // Prepare data for the revenue vs cost bar chart
  const revenueData = analytics ? [
    { name: 'Total Revenue', value: analytics.totalRevenue || 0, color: '#22c55e' },
    { name: 'Transport Cost', value: analytics.totalTransportationCost || 0, color: '#f97316' },
    { name: 'Net Revenue', value: (analytics.totalRevenue || 0) - (analytics.totalTransportationCost || 0), color: '#3b82f6' },
  ] : [];

  if (isLoading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            eCommerce Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Data-driven performance tracking for professional collections
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:w-64">
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger>
                <Building2 className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="All Shops Performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">System Wide (Overall)</SelectItem>
                {shops.map(shop => (
                  <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {analytics?.totalRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">From {analytics?.totalOrders || 0} orders</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pieces Sold</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalPieces?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1 text-blue-600 font-medium">High demand pieces</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Transportation</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {analytics?.totalTransportationCost?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total distribution cost</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalOrders > 0 
                ? Math.round((analytics?.deliveredOrders / analytics?.totalOrders) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{analytics?.deliveredOrders || 0} fulfilled orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Financial Performance</CardTitle>
            <CardDescription>Breakdown of revenue and costs for eCommerce sales</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`ETB ${value.toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Order Distribution</CardTitle>
            <CardDescription>Current state of collections in transit or processing</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No order data to visualize</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Volume Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm">Total Orders</span>
                  <span className="font-bold">{analytics?.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm">Delivered</span>
                  <span className="font-bold text-green-600">{analytics?.deliveredOrders || 0}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm">Processing/Shipped</span>
                  <span className="font-bold text-indigo-600">{(analytics?.processingOrders || 0) + (analytics?.shippedOrders || 0)}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm">Cancelled</span>
                  <span className="font-bold text-red-600">{analytics?.cancelledOrders || 0}</span>
                </div>
             </div>
          </CardContent>
        </Card>

        {selectedShop !== "all" && (
           <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Shop Specific Impact</CardTitle>
              <CardDescription>How {shops.find(s => s.id === selectedShop)?.name} is contributing to eCommerce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Shop Revenue</p>
                  <p className="text-xl font-bold">ETB {analytics?.totalRevenue?.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Fulfilled Here</p>
                  <p className="text-xl font-bold">{analytics?.deliveredOrders} orders</p>
                </div>
                <div className="p-4 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase">Inventory Moving</p>
                  <p className="text-xl font-bold">{analytics?.totalPieces} units</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
