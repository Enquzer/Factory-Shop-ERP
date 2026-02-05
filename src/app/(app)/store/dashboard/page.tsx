'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Layers,
  Calendar,
  BarChart3,
  Banknote,
  Archive,
  RotateCcw
} from 'lucide-react';
import { MarketingOrder, getMarketingOrders } from '@/lib/marketing-orders';
import { Order, getOrders } from '@/lib/orders';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { format } from 'date-fns';
import { authenticatedFetch } from '@/lib/utils';

export default function StoreDashboardPage() {
  const [marketingOrders, setMarketingOrders] = useState<MarketingOrder[]>([]);
  const [shopOrders, setShopOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState<'preset' | 'custom'>('preset');
  const [presetRange, setPresetRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('all');
  const [startDate, setStartDate] = useState<string>(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const { user } = useAuth();

  // Date range calculation
  const getDateRange = () => {
    if (selectedDateRange === 'custom') {
      return { 
        start: new Date(startDate), 
        end: new Date(endDate) 
      };
    }
    
    const now = new Date();
    switch (presetRange) {
      case 'today':
        return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return { start: weekStart, end: now };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return { start: quarterStart, end: now };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      case 'all':
      default:
        return { start: new Date(0), end: new Date() };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const [mOrders, sOrders, pData, rmData, reqData] = await Promise.all([
        getMarketingOrders(),
        getOrders(),
        authenticatedFetch('/api/products').then(res => res.json()),
        authenticatedFetch('/api/raw-materials').then(res => res.json()),
        authenticatedFetch('/api/requisitions').then(res => res.json())
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

  // Filter data by date range
  const { start, end } = getDateRange();
  
  const filteredMarketingOrders = marketingOrders.filter(order => {
    const orderDate = new Date(order.createdAt || order.updatedAt);
    return orderDate >= start && orderDate <= end;
  });

  const filteredShopOrders = shopOrders.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate >= start && orderDate <= end;
  });

  // Calculate KPIs
  const calculateKPIs = () => {
    // Finished Goods KPIs
    const totalFinishedGoods = filteredMarketingOrders.filter(o => o.status === 'Store').length;
    const finishedIn = filteredMarketingOrders.filter(o => o.status === 'Store').length;
    const finishedOut = filteredMarketingOrders.filter(o => o.status === 'Delivery').length; // Using Delivery instead of Dispatched
    
    // Raw Material KPIs
    const totalRawMaterials = rawMaterials.length;
    const totalRawValue = rawMaterials.reduce((sum, rm) => sum + (rm.currentBalance * rm.costPerUnit), 0);
    
    // Category-wise analysis
    const categoryAnalysis: Record<string, { count: number; value: number; volume: number }> = rawMaterials.reduce((acc, rm) => {
      if (!acc[rm.category]) {
        acc[rm.category] = { count: 0, value: 0, volume: 0 };
      }
      acc[rm.category].count += 1;
      acc[rm.category].value += rm.currentBalance * rm.costPerUnit;
      acc[rm.category].volume += rm.currentBalance;
      return acc;
    }, {} as Record<string, { count: number; value: number; volume: number }>);
    
    // In/Out comparison by product category
    const productCategories: Record<string, { in: number; out: number }> = Array.isArray(products) ? products.reduce((acc, product) => {
      const category = product.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { in: 0, out: 0 };
      }
      // Simplified logic - in reality would need transaction data
      acc[category].in += 1; // Placeholder
      acc[category].out += 1; // Placeholder
      return acc;
    }, {} as Record<string, { in: number; out: number }>) : {};
    
    return {
      finishedGoods: {
        total: totalFinishedGoods,
        in: finishedIn,
        out: finishedOut,
        net: finishedIn - finishedOut
      },
      rawMaterials: {
        total: totalRawMaterials,
        totalValue: totalRawValue,
        categories: categoryAnalysis
      },
      productFlow: productCategories
    };
  };

  const kpis = calculateKPIs();

  const incomingFromPacking = filteredMarketingOrders.filter(o => o.status === 'Store');
  const readyForDispatch = filteredShopOrders.filter(o => o.status === 'Released');
  const pendingDispatch = filteredShopOrders.filter(o => o.status === 'Pending' || o.status === 'Paid');
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

      {/* Advanced Date Range Selector */}
      <Card className="shadow-lg border-none mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Toggle between preset and custom ranges */}
            <div className="flex gap-2">
              <Button
                variant={selectedDateRange === 'preset' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDateRange('preset')}
              >
                Preset Ranges
              </Button>
              <Button
                variant={selectedDateRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDateRange('custom')}
              >
                Custom Range
              </Button>
            </div>

            {selectedDateRange === 'preset' ? (
              /* Preset Date Ranges */
              <div className="flex flex-wrap gap-2">
                {(['today', 'week', 'month', 'quarter', 'year', 'all'] as const).map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={presetRange === range ? 'default' : 'outline'}
                    onClick={() => setPresetRange(range)}
                    className="capitalize"
                  >
                    {range === 'all' ? 'All Time' : range}
                  </Button>
                ))}
              </div>
            ) : (
              /* Custom Date Range */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-sm font-medium">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Date Range Display */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Showing data from <span className="font-medium text-foreground">{format(getDateRange().start, 'MMM dd, yyyy')}</span> to{' '}
                <span className="font-medium text-foreground">{format(getDateRange().end, 'MMM dd, yyyy')}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Major KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Finished Goods */}
        <Card className="border-none shadow-md bg-white border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Finished Goods</CardTitle>
            <Archive className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.finishedGoods.total}</div>
            <p className="text-xs text-muted-foreground">Total registered garments</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">In: {kpis.finishedGoods.in}</Badge>
              <Badge variant="outline" className="text-xs">Out: {kpis.finishedGoods.out}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Raw Material Value */}
        <Card className="border-none shadow-md bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Raw Material Value</CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {kpis.rawMaterials.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total inventory value</p>
            <div className="text-xs text-muted-foreground mt-1">
              {kpis.rawMaterials.total} materials tracked
            </div>
          </CardContent>
        </Card>

        {/* In/Out Comparison */}
        <Card className="border-none shadow-md bg-white border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Inventory Flow</CardTitle>
            <RotateCcw className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.finishedGoods.net}</div>
            <p className="text-xs text-muted-foreground">Net finished goods</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-green-600">+{kpis.finishedGoods.in} In</span>
              <span className="text-xs text-red-600">-{kpis.finishedGoods.out} Out</span>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="border-none shadow-md bg-white border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Stock Alerts</CardTitle>
            <AlertCircle className={`h-4 w-4 ${lowStockItems.length > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-600' : 'text-inherit'}`}>
                {lowStockItems.length}
            </div>
            <p className="text-xs text-muted-foreground">Products below threshold</p>
            <div className="text-xs text-muted-foreground mt-1">
              {lowStockMaterials.length} raw materials low
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw Material Category Analysis */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Raw Material Analysis by Category
          </CardTitle>
          <CardDescription>Detailed breakdown of raw material inventory by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(kpis.rawMaterials.categories).map(([category, data]) => (
              <div key={category} className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm">{category}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {(data as { count: number; value: number; volume: number }).count} items
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume:</span>
                    <span className="font-medium">{(data as { count: number; value: number; volume: number }).volume.toFixed(1)} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-medium text-emerald-600">ETB {(data as { count: number; value: number; volume: number }).value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Avg. Unit Cost:</span>
                    <span>
                      {(data as { count: number; value: number; volume: number }).volume > 0 
                        ? `ETB ${((data as { count: number; value: number; volume: number }).value / (data as { count: number; value: number; volume: number }).volume).toFixed(2)}` 
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(kpis.rawMaterials.categories).length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No raw material data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Category Flow Comparison */}
      <Card className="shadow-lg border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Product Flow by Category
          </CardTitle>
          <CardDescription>Incoming vs outgoing by product category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Category</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Incoming</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Outgoing</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Net Flow</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Flow Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(kpis.productFlow).map(([category, flow]) => (
                  <tr key={category} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{category}</td>
                    <td className="py-2 text-right text-green-600">{(flow as { in: number; out: number }).in}</td>
                    <td className="py-2 text-right text-red-600">{(flow as { in: number; out: number }).out}</td>
                    <td className="py-2 text-right font-medium">
                      <span className={(flow as { in: number; out: number }).in - (flow as { in: number; out: number }).out >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {(flow as { in: number; out: number }).in - (flow as { in: number; out: number }).out}
                      </span>
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {(flow as { in: number; out: number }).out > 0 
                        ? `${(((flow as { in: number; out: number }).in / (flow as { in: number; out: number }).out) * 100).toFixed(1)}%` 
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
                {Object.keys(kpis.productFlow).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No product flow data available</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Sections */}
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
