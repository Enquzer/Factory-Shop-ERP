"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GanttChart } from '@/components/gantt-chart';
import { ResponsiveGrid } from '@/components/responsive-grid';
import { ResponsiveCard } from '@/components/responsive-card';
import { ResponsiveTable } from '@/components/responsive-table';
import { AIDistributionChart } from '@/components/ai-distribution-chart';
import { InventoryMetrics } from '@/components/inventory-metrics';
import { getOrders } from '@/lib/orders';
import { getShops } from '@/lib/shops';
import { getProducts } from '@/lib/products';
import { Order } from '@/lib/orders';
import { Shop } from '@/lib/shops';
import { Product } from '@/lib/products';
import { format } from 'date-fns';
import { 
  Calendar, 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  Store, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Download,
  Package2,
  BarChart3
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function FactoryOrdersAnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [orderData, shopData, productData] = await Promise.all([
          getOrders(),
          getShops(),
          getProducts()
        ]);
        
        setOrders(orderData);
        setFilteredOrders(orderData);
        setShops(shopData);
        setProducts(productData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter orders based on search and filters
  useEffect(() => {
    let result = [...orders];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.shopName.toLowerCase().includes(term) ||
        order.id.toLowerCase().includes(term) ||
        order.items.some(item => 
          products.some(p => 
            p.id === item.productId && 
            (p.name.toLowerCase().includes(term) || p.productCode.toLowerCase().includes(term))
          )
        )
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    // Apply date range filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      result = result.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    setFilteredOrders(result);
  }, [searchTerm, statusFilter, dateRange, orders, products]);

  // Calculate metrics
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
  const closedOrders = orders.filter(o => o.isClosed).length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);

  // Get shop with most orders
  const shopOrderCounts: Record<string, number> = {};
  orders.forEach(order => {
    shopOrderCounts[order.shopName] = (shopOrderCounts[order.shopName] || 0) + 1;
  });
  const topShop = Object.entries(shopOrderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Get most ordered product
  const productCounts: Record<string, number> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        productCounts[product.name] = (productCounts[product.name] || 0) + item.quantity;
      }
    });
  });
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Prepare orders for Gantt chart
  const ordersForGantt = filteredOrders.map(order => {
    // Add product information to each order
    const orderWithProductInfo = { ...order };
    
    // Add items with product details
    orderWithProductInfo.items = order.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        ...item,
        productName: product?.name || 'Unknown Product',
        productCode: product?.productCode || 'N/A'
      };
    });
    
    // Add shop information
    const shop = Array.isArray(shops) ? shops.find(s => s.id === order.shopId) : undefined;
    orderWithProductInfo.shopName = shop?.name || order.shopName;
    
    return orderWithProductInfo;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading analytics data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Factory Orders Analytics</h1>
        <p className="mt-2 text-gray-600">
          Track and analyze orders placed by shops with detailed metrics and insights
        </p>
      </div>

      {/* Inventory Metrics */}
      <div className="mb-8">
        <InventoryMetrics products={products} shops={shops} />
      </div>

      {/* Metrics Dashboard */}
      <div className="mb-8">
        <ResponsiveGrid desktopCols={2} largeDesktopCols={4} className="gap-4">
          <ResponsiveCard>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">All time orders</p>
              </CardContent>
            </Card>
          </ResponsiveCard>

          <ResponsiveCard>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders}</div>
                <p className="text-xs text-muted-foreground">Awaiting fulfillment</p>
              </CardContent>
            </Card>
          </ResponsiveCard>

          <ResponsiveCard>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredOrders}</div>
                <p className="text-xs text-muted-foreground">Successfully delivered</p>
              </CardContent>
            </Card>
          </ResponsiveCard>

          <ResponsiveCard>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">ETB {totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All time sales</p>
              </CardContent>
            </Card>
          </ResponsiveCard>
        </ResponsiveGrid>
      </div>

      {/* Additional Metrics */}
      <div className="mb-8">
        <ResponsiveGrid desktopCols={1} largeDesktopCols={3} className="gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topShop}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Most orders placed by a single shop
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Most Ordered Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topProduct}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Highest quantity ordered across all shops
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Closed Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{closedOrders}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Orders confirmed received by shops
              </p>
            </CardContent>
          </Card>
        </ResponsiveGrid>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search shops, products..."
              className="pl-8 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Shipped">Shipped</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-full md:w-auto"
            />
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-full md:w-auto"
            />
          </div>
        </div>
        
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* AI Distribution Visualization */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              AI Distribution Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              AI automatically distributes total order quantity across available product variants
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.isArray(filteredOrders) && filteredOrders.slice(0, 2).map((order) => {
                // Group order items by product
                const productGroups: Record<string, any[]> = {};
                if (order.items && Array.isArray(order.items)) {
                  order.items.forEach(item => {
                    if (item.productId && !productGroups[item.productId]) {
                      productGroups[item.productId] = [];
                    }
                    if (item.productId) {
                      productGroups[item.productId].push(item);
                    }
                  });
                }

                return Object.entries(productGroups).map(([productId, items]) => {
                  const product = Array.isArray(products) ? products.find(p => p.id === productId) : undefined;
                  const totalQuantity = Array.isArray(items) ? items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
                  
                  if (!product) return null;
                  
                  return (
                    <AIDistributionChart 
                      key={`${order.id}-${productId}`}
                      productVariants={Array.isArray(product.variants) ? product.variants : []}
                      orderItems={Array.isArray(items) ? items : []}
                      productName={product.name || 'Unknown Product'}
                      totalOrderQuantity={totalQuantity}
                    />
                  );
                });
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart View */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Order Timeline (Gantt Chart)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GanttChart orders={ordersForGantt} />
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Shop Orders
              </div>
              <Badge variant="secondary">{filteredOrders.length} orders</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable 
              headers={[
                { key: 'id', title: 'Order ID', mobileTitle: 'ID' },
                { key: 'shopName', title: 'Shop', mobileTitle: 'Shop' },
                { key: 'products', title: 'Products', mobileTitle: 'Products' },
                { key: 'date', title: 'Date', mobileTitle: 'Date' },
                { key: 'amount', title: 'Amount', mobileTitle: 'Amount' },
                { key: 'status', title: 'Status', mobileTitle: 'Status' },
                { key: 'deliveryDate', title: 'Delivery', mobileTitle: 'Delivery' },
                { key: 'actions', title: 'Actions', mobileTitle: 'Actions' },
              ]}
              data={filteredOrders.map(order => {
                const shop = Array.isArray(shops) ? shops.find(s => s.id === order.shopId) : undefined;
                const productNames = order.items.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return product ? `${product.name} (${item.quantity})` : `Product ${item.productId} (${item.quantity})`;
                }).join(', ');
                
                return {
                  ...order,
                  shopName: shop?.name || order.shopName,
                  products: productNames,
                  date: order.date && !isNaN(Date.parse(order.date)) ? format(new Date(order.date), 'MMM dd, yyyy') : 'Invalid Date',
                  amount: `ETB ${order.amount.toLocaleString()}`,
                  deliveryDate: order.deliveryDate && !isNaN(Date.parse(order.deliveryDate)) ? format(new Date(order.deliveryDate), 'MMM dd') : 'N/A',
                  actions: (
                    <Button variant="outline" size="sm">View</Button>
                  )
                };
              })}
              renderRow={(order: any, index: number) => {
                const shop = Array.isArray(shops) ? shops.find(s => s.id === order.shopId) : undefined;
                const productNames = order.items.map((item: any) => {
                  const product = products.find(p => p.id === item.productId);
                  return product ? `${product.name} (${item.quantity})` : `Product ${item.productId} (${item.quantity})`;
                }).join(', ');
                
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Store className="h-4 w-4 mr-2 text-muted-foreground" />
                        {shop?.name || order.shopName}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{productNames}</TableCell>
                    <TableCell>{order.date && !isNaN(Date.parse(order.date)) ? format(new Date(order.date), 'MMM dd, yyyy') : 'Invalid Date'}</TableCell>
                    <TableCell>ETB {order.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          order.status === 'Delivered' ? 'default' : 
                          order.status === 'Pending' ? 'secondary' : 
                          order.status === 'Cancelled' ? 'destructive' : 
                          'outline'
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.deliveryDate && !isNaN(Date.parse(order.deliveryDate)) ? format(new Date(order.deliveryDate), 'MMM dd') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                );
              }}
            />
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No orders found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}