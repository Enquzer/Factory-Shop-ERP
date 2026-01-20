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
  Truck,
  Clock
} from 'lucide-react';
import { Order, getOrders } from '@/lib/orders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveTable } from '@/components/responsive-table';
import { useAuth } from '@/contexts/auth-context';

export default function StoreManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [dispatchedOrders, setDispatchedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const allOrders = await getOrders();
      setOrders(allOrders);
      
      // Ready for dispatch: Status is 'Released' or 'Paid' (for backward compatibility)
      const ready = allOrders.filter(order => 
        order.status === 'Released' || order.status === 'Paid'
      );
      // History: Status is 'Dispatched' or 'Delivered'
      const dispatched = allOrders.filter(order => 
        order.status === 'Dispatched' || order.status === 'Delivered'
      );
      
      setReadyOrders(ready);
      setDispatchedOrders(dispatched);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare table data for ready orders
  const readyOrderRows = readyOrders.map(order => ({
    id: order.id,
    shop: order.shopName,
    date: new Date(order.date).toLocaleDateString(),
    items: `${order.items.length} items`,
    paymentStatus: (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex w-fit items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Verified
      </Badge>
    ),
    status: (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        Ready for Dispatch
      </Badge>
    ),
    actions: (
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = `/store/orders/${order.id}`}
        >
          <Truck className="h-4 w-4 mr-2" />
          Dispatch
        </Button>
      </div>
    )
  }));

  // Prepare table data for dispatched orders
  const dispatchedOrderRows = dispatchedOrders.map(order => ({
    id: order.id,
    shop: order.shopName,
    date: new Date(order.date).toLocaleDateString(),
    items: `${order.items.length} items`,
    paymentStatus: (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex w-fit items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Paid
      </Badge>
    ),
    status: (
      <Badge 
        variant={order.status === 'Dispatched' ? 'secondary' : 'default'}
        className={order.status === 'Dispatched' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}
      >
        {order.status}
      </Badge>
    ),
    actions: (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => window.location.href = `/store/orders/${order.id}`}
      >
        <Eye className="h-4 w-4 mr-2" />
        View
      </Button>
    )
  }));

  const readyHeaders = [
    { key: 'shop', title: 'Shop', mobileTitle: 'Shop' },
    { key: 'date', title: 'Date', mobileTitle: 'Date' },
    { key: 'items', title: 'Items', mobileTitle: 'Items' },
    { key: 'paymentStatus', title: 'Payment Status', mobileTitle: 'Payment' },
    { key: 'status', title: 'Order Status', mobileTitle: 'Status' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' }
  ];

  const dispatchedHeaders = [
    { key: 'shop', title: 'Shop', mobileTitle: 'Shop' },
    { key: 'date', title: 'Date', mobileTitle: 'Date' },
    { key: 'items', title: 'Items', mobileTitle: 'Items' },
    { key: 'paymentStatus', title: 'Payment Status', mobileTitle: 'Payment' },
    { key: 'status', title: 'Order Status', mobileTitle: 'Status' },
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
        <h1 className="text-3xl font-bold">Store Management</h1>
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <Package className="h-4 w-4 mr-2" />
          Active
        </Badge>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Dispatch</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyOrders.length}</div>
            <p className="text-xs text-muted-foreground">Paid & Ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchedOrders.length}</div>
            <p className="text-xs text-muted-foreground">Successfully sent</p>
          </CardContent>
        </Card>
        
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
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue="ready" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ready">Ready for Dispatch</TabsTrigger>
          <TabsTrigger value="history">Dispatch History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ready" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Ready for Dispatch</CardTitle>
            </CardHeader>
            <CardContent>
              {readyOrders.length > 0 ? (
                <ResponsiveTable 
                  headers={readyHeaders} 
                  data={readyOrderRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="mx-auto h-12 w-12 mb-4" />
                  <p>No orders ready for dispatch</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispatch History</CardTitle>
            </CardHeader>
            <CardContent>
              {dispatchedOrders.length > 0 ? (
                <ResponsiveTable 
                  headers={dispatchedHeaders} 
                  data={dispatchedOrderRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4" />
                  <p>No orders dispatched yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}