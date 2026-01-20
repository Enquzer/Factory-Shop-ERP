"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { LoadingBar } from "@/components/loading-bar";
import { getOrdersFromDB } from "@/lib/orders";
import { Order } from "@/lib/orders";

export default function FinanceDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const fetchedOrders = await getOrdersFromDB();
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Calculate finance metrics
  const calculateMetrics = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      return orderDate >= thirtyDaysAgo;
    });

    const pendingPaymentOrders = orders.filter(order => 
      order.status === 'Awaiting Payment' || order.status === 'Pending'
    );

    const paidOrders = orders.filter(order => order.status === 'Paid');
    
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.amount, 0);
    const pendingPayments = pendingPaymentOrders.reduce((sum, order) => sum + order.amount, 0);
    
    const recentRevenue = recentOrders
      .filter(order => order.status === 'Paid')
      .reduce((sum, order) => sum + order.amount, 0);

    return {
      totalOrders: orders.length,
      pendingPayments: pendingPaymentOrders.length,
      paidOrders: paidOrders.length,
      totalRevenue,
      pendingAmount: pendingPayments,
      recentRevenue,
      avgOrderValue: orders.length > 0 ? totalRevenue / paidOrders.length : 0
    };
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingBar isLoading={true} message="Loading finance dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h1 className="text-2xl font-semibold text-destructive">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={fetchOrders}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <Button onClick={fetchOrders} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {metrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {metrics.paidOrders} paid orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {metrics.pendingAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {metrics.pendingPayments} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Revenue (30 days)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {metrics.recentRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {metrics.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Per paid order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
            <CardDescription>Current order payment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Paid Orders</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {metrics.paidOrders}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span>Awaiting Payment</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {metrics.pendingPayments}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span>Total Orders</span>
                </div>
                <Badge variant="secondary">
                  {metrics.totalOrders}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 5 orders requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders
                .filter(order => order.status === 'Awaiting Payment' || order.status === 'Pending')
                .slice(0, 5)
                .map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{order.shopName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">ETB {order.amount.toLocaleString()}</p>
                      <Badge variant={
                        order.status === 'Awaiting Payment' ? 'destructive' : 'secondary'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              
              {orders.filter(order => order.status === 'Awaiting Payment' || order.status === 'Pending').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No pending payments</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common finance operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <ShoppingCart className="mr-2 h-4 w-4" />
              View All Orders
            </Button>
            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Payment Verification
            </Button>
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Financial Reports
            </Button>
            <Button variant="outline">
              <AlertCircle className="mr-2 h-4 w-4" />
              Low Balance Alerts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}