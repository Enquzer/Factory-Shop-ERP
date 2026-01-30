'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, 
  Truck, 
  CheckCircle, 
  Eye, 
  Clock, 
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Order, getOrders } from '@/lib/orders';
import { useAuth } from '@/contexts/auth-context';
import { ResponsiveTable } from '@/components/responsive-table';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function StoreOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const allOrders = await getOrders();
      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const readyOrders = filteredOrders.filter(o => o.status === 'Released' || o.status === 'Paid');
  const dispatchedOrders = filteredOrders.filter(o => o.status === 'Dispatched' || o.status === 'Delivered');
  const pendingOrders = filteredOrders.filter(o => o.status === 'Pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Released':
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800">Ready for Dispatch</Badge>;
      case 'Dispatched':
        return <Badge className="bg-blue-100 text-blue-800">Dispatched</Badge>;
      case 'Delivered':
        return <Badge className="bg-purple-100 text-purple-800">Delivered</Badge>;
      case 'Pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Pending Payment</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const headers = [
    { key: 'displayId', title: 'Order ID', mobileTitle: 'ID' },
    { key: 'shop', title: 'Shop', mobileTitle: 'Shop' },
    { key: 'date', title: 'Date', mobileTitle: 'Date' },
    { key: 'amount', title: 'Amount', mobileTitle: 'Amt' },
    { key: 'status', title: 'Status', mobileTitle: 'Status' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' }
  ];

  const renderOrderRows = (orderList: Order[]) => orderList.map(order => ({
    id: order.id,
    displayId: <span className="font-mono text-xs">{order.id.slice(0, 8)}...</span>,
    shop: <div className="font-medium">{order.shopName}</div>,
    date: new Date(order.date).toLocaleDateString(),
    amount: `${order.amount.toLocaleString()} ETB`,
    status: getStatusBadge(order.status),
    actions: (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/store/orders/${order.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Link>
      </Button>
    )
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Shop Orders</h1>
        <p className="text-muted-foreground">Manage and dispatch orders from shops.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by shop name or order ID..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="ready" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="ready" className="flex items-center gap-2">
            Ready <Badge className="ml-1 px-1.5 h-5 min-w-5">{readyOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending <Badge className="ml-1 px-1.5 h-5 min-w-5" variant="outline">{pendingOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Ready to Dispatch</CardTitle>
              <CardDescription>Orders with verified payment ready for delivery</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ResponsiveTable 
                    headers={headers}
                    data={renderOrderRows(readyOrders)}
                />
                {readyOrders.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20 text-green-500" />
                        <p>No orders currently ready for dispatch</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Pending Payment</CardTitle>
              <CardDescription>Orders placed by shops awaiting finance verification</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ResponsiveTable 
                    headers={headers}
                    data={renderOrderRows(pendingOrders)}
                />
                {pendingOrders.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No pending orders</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-md">
            <CardHeader>
              <CardTitle>Dispatch History</CardTitle>
              <CardDescription>Orders that have already been dispatched or delivered</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ResponsiveTable 
                    headers={headers}
                    data={renderOrderRows(dispatchedOrders)}
                />
                {dispatchedOrders.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No dispatch history found</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
