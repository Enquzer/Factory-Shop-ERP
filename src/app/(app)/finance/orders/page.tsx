"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  DollarSign,
  Calendar,
  Filter
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { LoadingBar } from "@/components/loading-bar";
import { getOrders } from "@/lib/orders";
import { Order } from "@/lib/orders";
import { ResponsiveTable } from "@/components/responsive-table";
import { useRouter } from "next/navigation";

export default function FinanceOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      if (orders.length === 0) setLoading(true);
      const fetchedOrders = await getOrders();
      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders for finance perspective
  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    return true;
  });

  // Separate orders by payment status
  const awaitingPaymentOrders = orders.filter(order => 
    order.status === 'Awaiting Payment' || order.status === 'Pending'
  );
  
  const paidOrders = orders.filter(order => 
    order.status === 'Paid' || order.status === 'Dispatched' || order.status === 'Delivered'
  );

  // Prepare table data for all orders
  const orderRows = filteredOrders.map(order => ({
    id: order.id,
    shop: order.shopName,
    date: format(new Date(order.date), 'MMM d, yyyy'),
    amount: `ETB ${order.amount.toLocaleString()}`,
    status: (
      <Badge 
        variant={
          order.status === 'Paid' ? 'default' :
          order.status === 'Awaiting Payment' || order.status === 'Pending' ? 'destructive' :
          order.status === 'Dispatched' ? 'secondary' : 'outline'
        }
        className={
          order.status === 'Paid' ? 'bg-green-100 text-green-800' :
          order.status === 'Awaiting Payment' || order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
          order.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }
      >
        {order.status}
      </Badge>
    ),
    actions: (
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push(`/finance/orders/${order.id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
        {(order.status === 'Awaiting Payment' || order.status === 'Pending') && (
          <Button 
            size="sm"
            onClick={() => router.push(`/finance/orders/${order.id}`)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Verify Payment
          </Button>
        )}
      </div>
    )
  }));

  const orderHeaders = [
    { key: 'shop', title: 'Shop', mobileTitle: 'Shop' },
    { key: 'date', title: 'Order Date', mobileTitle: 'Date' },
    { key: 'amount', title: 'Amount', mobileTitle: 'Amount' },
    { key: 'status', title: 'Status', mobileTitle: 'Status' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingBar isLoading={true} message="Loading finance orders..." />
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Finance Orders</h1>
          <p className="text-muted-foreground">
            Manage order payments and financial verification
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">All orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{awaitingPaymentOrders.length}</div>
            <p className="text-xs text-muted-foreground">Need verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidOrders.length}</div>
            <p className="text-xs text-muted-foreground">Payment confirmed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {awaitingPaymentOrders.reduce((sum, order) => sum + order.amount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Order Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Order Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Awaiting Payment">Awaiting Payment</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>
            View and verify payments for all orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <ResponsiveTable 
              headers={orderHeaders} 
              data={orderRows} 
              className="w-full"
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              <p>No orders found matching the current filters</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setStatusFilter('all')}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Finance Operations</CardTitle>
          <CardDescription>Common financial management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push('/finance')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Finance Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/finance/reports')}>
              <DollarSign className="mr-2 h-4 w-4" />
              Financial Reports
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Payment Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}