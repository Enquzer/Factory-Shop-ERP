'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  Eye, 
  CheckCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Truck
} from 'lucide-react';
import { Order, getOrders } from '@/lib/orders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveTable } from '@/components/responsive-table';
import { useAuth } from '@/contexts/auth-context';

export default function FinanceManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [awaitingPaymentOrders, setAwaitingPaymentOrders] = useState<Order[]>([]);
  const [paidOrders, setPaidOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const allOrders = await getOrders();
      setOrders(allOrders);
      
      // Filter orders by status
      const awaitingPayment = allOrders.filter(order => 
        order.status === 'Awaiting Payment'
      );
      const paid = allOrders.filter(order => 
        order.status === 'Paid' || order.status === 'Dispatched' || order.status === 'Delivered'
      );
      
      setAwaitingPaymentOrders(awaitingPayment);
      setPaidOrders(paid);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare table data for awaiting payment orders
  const awaitingPaymentRows = awaitingPaymentOrders.map(order => ({
    id: order.id,
    shop: order.shopName,
    date: new Date(order.date).toLocaleDateString(),
    amount: `ETB ${order.amount.toLocaleString()}`,
    status: (
      <Badge className="bg-yellow-100 text-yellow-800">
        Awaiting Payment
      </Badge>
    ),
    actions: (
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = `/finance/orders/${order.id}`}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      </div>
    )
  }));

  // Prepare table data for paid orders
  const paidOrderRows = paidOrders.map(order => ({
    id: order.id,
    shop: order.shopName,
    date: new Date(order.date).toLocaleDateString(),
    amount: `ETB ${order.amount.toLocaleString()}`,
    status: (
      <Badge 
        variant={order.status === 'Paid' ? 'default' : order.status === 'Dispatched' ? 'secondary' : 'destructive'}
        className={
          order.status === 'Paid' ? 'bg-green-100 text-green-800' :
          order.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' :
          'bg-purple-100 text-purple-800'
        }
      >
        {order.status}
      </Badge>
    ),
    actions: (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => window.location.href = `/finance/orders/${order.id}`}
      >
        <Eye className="h-4 w-4 mr-2" />
        View
      </Button>
    )
  }));

  const awaitingPaymentHeaders = [
    { key: 'shop', title: 'Shop', mobileTitle: 'Shop' },
    { key: 'date', title: 'Date', mobileTitle: 'Date' },
    { key: 'amount', title: 'Amount', mobileTitle: 'Amount' },
    { key: 'status', title: 'Status', mobileTitle: 'Status' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' }
  ];

  const paidHeaders = [
    { key: 'shop', title: 'Shop', mobileTitle: 'Shop' },
    { key: 'date', title: 'Date', mobileTitle: 'Date' },
    { key: 'amount', title: 'Amount', mobileTitle: 'Amount' },
    { key: 'status', title: 'Status', mobileTitle: 'Status' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Finance Management</h1>
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <DollarSign className="h-4 w-4 mr-2" />
          Active
        </Badge>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Payment</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{awaitingPaymentOrders.length}</div>
            <p className="text-xs text-muted-foreground">Needs payment verification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidOrders.length}</div>
            <p className="text-xs text-muted-foreground">Payment verified</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {(orders.reduce((sum, order) => sum + order.amount, 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Overall value</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue="awaiting-payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="awaiting-payment">Awaiting Payment</TabsTrigger>
          <TabsTrigger value="paid">Paid Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="awaiting-payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Awaiting Payment Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {awaitingPaymentOrders.length > 0 ? (
                <ResponsiveTable 
                  headers={awaitingPaymentHeaders} 
                  data={awaitingPaymentRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>No orders awaiting payment verification</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="paid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paid Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {paidOrders.length > 0 ? (
                <ResponsiveTable 
                  headers={paidHeaders} 
                  data={paidOrderRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>No paid orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}