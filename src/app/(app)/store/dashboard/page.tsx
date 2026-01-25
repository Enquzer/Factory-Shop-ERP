'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  Truck, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Inbox, 
  TrendingUp,
  AlertCircle,
  Layers
} from 'lucide-react';
import { MarketingOrder, getMarketingOrders } from '@/lib/marketing-orders';
import { Order, getOrders } from '@/lib/orders';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function StoreDashboardPage() {
  const [marketingOrders, setMarketingOrders] = useState<MarketingOrder[]>([]);
  const [shopOrders, setShopOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mOrders, sOrders, pData, rmData, reqData] = await Promise.all([
        getMarketingOrders(),
        getOrders(),
        fetch('/api/products').then(res => res.json()),
        fetch('/api/raw-materials').then(res => res.json()),
        fetch('/api/requisitions').then(res => res.json())
      ]);
      setMarketingOrders(mOrders);
      setShopOrders(sOrders);
      setProducts(pData);
      setRawMaterials(Array.isArray(rmData) ? rmData : []);
      setRequisitions(Array.isArray(reqData) ? reqData : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const incomingFromPacking = marketingOrders.filter(o => o.status === 'Store');
  const readyForDispatch = shopOrders.filter(o => o.status === 'Released');
  const pendingDispatch = shopOrders.filter(o => o.status === 'Pending' || o.status === 'Paid');
  const pendingRequisitions = requisitions.filter(r => r.status !== 'Completed');
  
  // Calculate low stock items
  const lowStockItems = Array.isArray(products) ? products.filter(product => {
      const totalStock = product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      return totalStock < (product.minimumStockLevel || 10);
  }) : [];

  const lowStockMaterials = rawMaterials.filter(rm => rm.currentBalance < rm.minimumStockLevel);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Store Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor inventory flow and shop order fulfilment.</p>
        </div>
        <div className="flex gap-2">
            <Button asChild variant="outline" className="border-teal-200 hover:bg-teal-50 text-teal-700">
                <Link href="/raw-materials">
                    <Layers className="mr-2 h-4 w-4" />
                    Raw Materials
                </Link>
            </Button>
            <Button asChild variant="outline" className="border-indigo-200 hover:bg-indigo-50 text-indigo-700">
                <Link href="/store/issue">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Material Issuance
                </Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/store/receive">
                    <Inbox className="mr-2 h-4 w-4" />
                    Receive Goods
                </Link>
            </Button>
            <Button asChild>
                <Link href="/store/orders">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Shop Orders
                </Link>
            </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-md bg-white border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Incoming Goods</CardTitle>
            <Inbox className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incomingFromPacking.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting registration</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Material Req.</CardTitle>
            <ShoppingCart className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequisitions.length}</div>
            <p className="text-xs text-muted-foreground">Pending production requests</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Raw Materials</CardTitle>
            <Layers className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rawMaterials.length}</div>
            <p className={`text-xs ${lowStockMaterials.length > 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                {lowStockMaterials.length} below min level
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Ready Dispatch</CardTitle>
            <Truck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyForDispatch.length}</div>
            <p className="text-xs text-muted-foreground">Verified & Released</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Stock Alerts</CardTitle>
            <AlertCircle className={`h-4 w-4 ${lowStockItems.length > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-600' : 'text-inherit'}`}>
                {lowStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground">Products below thresh.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Goods Section */}
        <Card className="shadow-lg border-none">
          <CardHeader className="bg-orange-50/50">
            <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5 text-orange-600" />
                Incoming from Packing
            </CardTitle>
            <CardDescription>Recently finished orders awaiting store registration</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {incomingFromPacking.length > 0 ? (
                <div className="divide-y">
                    {incomingFromPacking.slice(0, 5).map(order => (
                        <div key={order.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div>
                                <div className="font-bold">{order.orderNumber}</div>
                                <div className="text-sm text-muted-foreground">{order.productName} ({order.quantity} pcs)</div>
                            </div>
                            <Button size="sm" variant="ghost" asChild>
                                <Link href="/store/receive">
                                    Register <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    ))}
                    {incomingFromPacking.length > 5 && (
                        <div className="p-3 text-center">
                            <Button variant="link" asChild>
                                <Link href="/store/receive">View all incoming</Link>
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>All incoming goods registered</p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Shop Orders Section */}
        <Card className="shadow-lg border-none">
          <CardHeader className="bg-green-50/50">
            <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
                Dispatch Tasks
            </CardTitle>
            <CardDescription>Shop orders ready for delivery</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {readyForDispatch.length > 0 ? (
                <div className="divide-y">
                    {readyForDispatch.slice(0, 5).map(order => (
                        <div key={order.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div>
                                <div className="font-bold">{order.shopName}</div>
                                <div className="text-sm text-muted-foreground">{new Date(order.date).toLocaleDateString()} - {order.amount.toLocaleString()} ETB</div>
                            </div>
                            <Button size="sm" variant="ghost" asChild>
                                <Link href="/store/orders">
                                    Dispatch <Truck className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    ))}
                    {readyForDispatch.length > 5 && (
                        <div className="p-3 text-center">
                            <Button variant="link" asChild>
                                <Link href="/store/orders">View all dispatch tasks</Link>
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>All orders dispatched</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
