"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  XCircle,
  Truck,
  DollarSign,
  BarChart3,
  AlertCircle,
  MessageSquare,
  Sparkles,
  RotateCcw,
  Route
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

type OrderStats = {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalPieces: number;
  totalTransportationCost: number;
};

export default function EcommerceManagerDashboard() {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Fetch analytics
      const analyticsRes = await fetch('/api/ecommerce-manager/analytics', { headers: authHeaders });
      if (analyticsRes.ok) {
        const { analytics } = await analyticsRes.json();
        setStats(analytics);
      }
      
      // Fetch recent orders
      const ordersRes = await fetch('/api/ecommerce-manager/orders', { headers: authHeaders });
      if (ordersRes.ok) {
        const { orders } = await ordersRes.json();
        setRecentOrders(orders.slice(0, 10)); // Get latest 10 orders
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'processing': return 'bg-purple-500';
      case 'shipped': return 'bg-indigo-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">eCommerce Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage online orders, dispatch, and track performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ecommerce-manager/orders">
            <Button>
              <ShoppingCart className="mr-2 h-4 w-4" />
              View All Orders
            </Button>
          </Link>
          <Link href="/ecommerce-manager/support">
            <Button variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
              <MessageSquare className="mr-2 h-4 w-4" />
              Support Claims
            </Button>
          </Link>
          <Link href="/ecommerce-manager/returns">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <RotateCcw className="mr-2 h-4 w-4" />
              Returns
            </Button>
          </Link>
          <Link href="/ecommerce-manager/requests">
            <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
              <Sparkles className="mr-2 h-4 w-4" />
              Rare Requests
            </Button>
          </Link>
          <Link href="/ecommerce-manager/dispatch">
            <Button variant="outline">
              <Truck className="mr-2 h-4 w-4" />
              Dispatch Center
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalPieces || 0} pieces total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {stats?.totalRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Transport: ETB {stats?.totalTransportationCost?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.deliveredOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.processingOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-500" />
              Shipped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.shippedOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats?.cancelledOrders || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest eCommerce orders requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{order.id}</div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {order.customerName} • {order.city}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleDateString()} • {order.orderItems?.length || 0} items
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">ETB {order.totalAmount?.toLocaleString()}</div>
                    <Link href={`/ecommerce-manager/orders?orderId=${order.id}`}>
                      <Button variant="ghost" size="sm" className="mt-2">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/ecommerce-manager/orders?status=pending">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Process Pending Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Review and confirm new customer orders
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ecommerce-manager/dispatch">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Manage Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Assign shops and create shipments
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ecommerce-manager/route-optimization">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Route className="h-4 w-4" />
                Route Optimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Optimize delivery routes and consolidate orders
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
