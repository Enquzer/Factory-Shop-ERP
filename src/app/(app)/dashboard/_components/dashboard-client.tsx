"use client";

import { useState, useEffect } from "react";
import {
  ArrowDownUp,
  Building2,
  Package,
  Wallet,
  Trophy,
  TrendingUp,
  Star,
  Calendar as CalendarIcon,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  Cell,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Order } from "@/lib/orders";
import { Product } from "@/lib/products";
import { Shop } from "@/lib/shops";
import { LoadingBar } from "@/components/loading-bar";
import { useResponsive } from '@/contexts/responsive-context';
import { ResponsiveGrid, ResponsiveGridItem } from '@/components/responsive-grid';

const PIE_CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
  quantity: {
    label: "Quantity",
  }
};

type DashboardClientPageProps = {
    products: Product[];
    orders: Order[];
    shops: Shop[];
    metrics: {
        totalProducts: number;
        registeredShops: number;
        activeOrders: number;
        recentOrders: Order[];
    };
    lowStockItems: { id: string; name: string; category: string; stock: number; isLow: boolean; }[];
}

export function DashboardClientPage({ products: initialProducts, orders: initialOrders, shops: initialShops, metrics: initialMetrics, lowStockItems: initialLowStockItems }: DashboardClientPageProps) {
  const [products, setProducts] = useState<Product[]>(Array.isArray(initialProducts) ? initialProducts : []);
  const [orders, setOrders] = useState<Order[]>(Array.isArray(initialOrders) ? initialOrders : []);
  const [shops, setShops] = useState<Shop[]>(Array.isArray(initialShops) ? initialShops : []);
  const [metrics, setMetrics] = useState({
    totalProducts: Array.isArray(initialProducts) ? initialProducts.length : 0,
    registeredShops: Array.isArray(initialShops) ? initialShops.length : 0,
    activeOrders: Array.isArray(initialOrders) ? initialOrders.filter((o: Order) => o.status === 'Pending' || o.status === 'Dispatched').length : 0,
    recentOrders: Array.isArray(initialMetrics?.recentOrders) ? initialMetrics.recentOrders : (Array.isArray(initialOrders) ? initialOrders.slice(0, 4) : [])
  });
  const [lowStockItems, setLowStockItems] = useState<Array<{ id: string; name: string; category: string; stock: number; isLow: boolean; }>>(Array.isArray(initialLowStockItems) ? initialLowStockItems : []);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Add timestamp to bust cache
      const timestamp = Date.now();
      
      // Get auth token for API requests
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;
      
      // Fetch fresh data
      const [freshProducts, freshOrders, freshShops] = await Promise.all([
        fetch(`/api/products?t=${timestamp}`, { headers }).then(res => {
          if (!res.ok && res.status === 401 && typeof window !== 'undefined') {
            window.location.href = '/login';
            return [];
          }
          return res.json();
        }),
        fetch(`/api/orders?t=${timestamp}`, { headers }).then(res => {
          if (!res.ok && res.status === 401 && typeof window !== 'undefined') {
            window.location.href = '/login';
            return [];
          }
          return res.json();
        }),
        fetch(`/api/shops?t=${timestamp}`, { headers }).then(res => {
          if (!res.ok && res.status === 401 && typeof window !== 'undefined') {
            window.location.href = '/login';
            return [];
          }
          return res.json();
        })
      ]);

      // Ensure we're setting arrays
      const productsArray = Array.isArray(freshProducts) ? freshProducts : [];
      const ordersArray = Array.isArray(freshOrders) ? freshOrders : [];
      const shopsArray = Array.isArray(freshShops) ? freshShops : [];

      setProducts(productsArray);
      setOrders(ordersArray);
      setShops(shopsArray);

      // Update metrics
      const freshMetrics = {
        totalProducts: productsArray.length,
        registeredShops: shopsArray.length,
        activeOrders: ordersArray.filter((o: Order) => o.status === 'Pending' || o.status === 'Dispatched').length,
        recentOrders: Array.isArray(ordersArray) ? ordersArray.slice(0, 4) : []
      };
      setMetrics(freshMetrics);

      // Update low stock items
      const freshLowStockItems = getLowStockItems(productsArray);
      setLowStockItems(freshLowStockItems);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLowStockItems = (products: Product[]) => {
    // Ensure products is an array
    const productsArray = Array.isArray(products) ? products : [];
    
    const lowStockItems: { id: string; name: string; category: string; stock: number; isLow: boolean; }[] = [];
    productsArray.forEach(product => {
        // Ensure product has required properties
        if (!product.id || !product.name || !product.category || !product.variants) return;
        
        // Ensure variants is an array
        const variantsArray = Array.isArray(product.variants) ? product.variants : [];
        const totalStock = variantsArray.reduce((acc, v) => acc + (v.stock || 0), 0);
        const minStock = product.minimumStockLevel ?? 10 * variantsArray.length;
        
        if (totalStock < minStock && totalStock > 0) {
            lowStockItems.push({
                id: product.id,
                name: product.name,
                category: product.category,
                stock: totalStock,
                isLow: true,
            });
        }
    });
    return lowStockItems.sort((a,b) => a.stock - b.stock);
  };

  const getSalesMetrics = (dateRange?: DateRange) => {
    // Ensure orders is an array
    const ordersArray = Array.isArray(orders) ? orders : [];
    const productsArray = Array.isArray(products) ? products : [];
    
    const productSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {};
    const shopPerformance: { [key: string]: number } = {};
    const productFrequency: { [key: string]: { name: string, count: number } } = {};
    const salesByDate: { [key: string]: number } = {};

    productsArray.forEach(p => {
        productSales[p.id] = { name: p.name, quantity: 0, revenue: p.price };
        productFrequency[p.id] = { name: p.name, count: 0 };
    });

    const filteredOrders = ordersArray.filter(order => {
        if (!dateRange || !dateRange.from) return true;
        const to = dateRange.to || new Date();
        // Ensure order.date is valid
        if (!order.date) return false;
        const orderDate = parseISO(order.date);
        return orderDate >= dateRange.from && orderDate <= to;
    });

    filteredOrders.forEach(order => {
        // Ensure order has required properties
        if (!order.shopName || !order.items) return;
        
        if (!shopPerformance[order.shopName]) {
            shopPerformance[order.shopName] = 0;
        }
        
        const orderDate = format(parseISO(order.date), "yyyy-MM-dd");
        if (!salesByDate[orderDate]) {
            salesByDate[orderDate] = 0;
        }

        // Ensure order.items is an array
        const orderItems = Array.isArray(order.items) ? order.items : [];
        orderItems.forEach(item => {
            // Ensure item has required properties
            if (!item.productId || !item.quantity) return;
            
            const product = productsArray.find(p => p.id === item.productId);
            if (!product) return;

            const itemRevenue = product.price * item.quantity;
            if(productSales[item.productId]) {
              productSales[item.productId].quantity += item.quantity;
            }
            shopPerformance[order.shopName] += itemRevenue;
            if(productFrequency[item.productId]) {
              productFrequency[item.productId].count++;
            }
            salesByDate[orderDate] += itemRevenue;
        });
    });

    const bestSelling = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((item, index) => ({
            ...item,
            fill: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
        }));

    const topShops = Object.entries(shopPerformance)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, revenue], index) => ({
            name,
            revenue,
            fill: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]
        }));

    const salesData = Object.entries(salesByDate)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { bestSelling, topShops, salesData };
  };

  const { bestSelling, topShops, salesData } = getSalesMetrics(date);

  return (
    <div className="space-y-6">
      <LoadingBar isLoading={isLoading} message="Refreshing dashboard data..." />
      <div className={`flex flex-col ${isMobile ? 'gap-2' : 'sm:flex-row'} items-center justify-between gap-4`}>
        <h1 className={`text-2xl font-semibold ${isMobile ? 'text-xl' : ''}`}>Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                size={isMobile ? "sm" : "default"}
                className={cn(
                  `${isMobile ? 'w-full' : 'w-full sm:w-[200px]'} justify-start text-left font-normal`,
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={isMobile ? 1 : 2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <ResponsiveGrid 
        mobileCols={1} 
        tabletCols={2} 
        desktopCols={4} 
        gap={4}
      >
        <ResponsiveGridItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProducts}</div>
            </CardContent>
          </Card>
        </ResponsiveGridItem>
        
        <ResponsiveGridItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Shops</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.registeredShops}</div>
            </CardContent>
          </Card>
        </ResponsiveGridItem>
        
        <ResponsiveGridItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeOrders}</div>
            </CardContent>
          </Card>
        </ResponsiveGridItem>
        
        <ResponsiveGridItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems.length}</div>
            </CardContent>
          </Card>
        </ResponsiveGridItem>
      </ResponsiveGrid>
      
      {/* Charts */}
      <ResponsiveGrid 
        mobileCols={1} 
        tabletCols={1} 
        desktopCols={2} 
        gap={4}
      >
        <ResponsiveGridItem>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {salesData.length > 0 ? (
                <ChartContainer config={chartConfig} className={`${isMobile ? 'h-[200px]' : 'h-[300px]'} w-full`}>
                  <BarChart data={salesData} width={isMobile ? 300 : 653} height={isMobile ? 200 : 300}>
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => format(new Date(value), isMobile ? "MM/dd" : "MMM dd")}
                      fontSize={isMobile ? 10 : 12}
                    />
                    <YAxis
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      fontSize={isMobile ? 10 : 12}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className={`flex items-center justify-center ${isMobile ? 'h-[200px]' : 'h-[300px]'} text-muted-foreground`}>
                  No sales data available
                </div>
              )}
            </CardContent>
          </Card>
        </ResponsiveGridItem>
        
        <ResponsiveGridItem>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              {bestSelling.length > 0 ? (
                <ChartContainer config={chartConfig} className={`${isMobile ? 'h-[200px]' : 'h-[300px]'} w-full`}>
                  <PieChart width={isMobile ? 300 : 653} height={isMobile ? 200 : 300}>
                    <Tooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={bestSelling}
                      dataKey="quantity"
                      nameKey="name"
                      innerRadius={isMobile ? 30 : 60}
                      strokeWidth={isMobile ? 3 : 5}
                    >
                      {bestSelling.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className={`flex items-center justify-center ${isMobile ? 'h-[200px]' : 'h-[300px]'} text-muted-foreground`}>
                  No product sales data available
                </div>
              )}
            </CardContent>
          </Card>
        </ResponsiveGridItem>
      </ResponsiveGrid>
      
      {/* Recent Orders and Low Stock Items */}
      <ResponsiveGrid 
        mobileCols={1} 
        tabletCols={1} 
        desktopCols={2} 
        gap={4}
      >
        <ResponsiveGridItem>
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders from your shops</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isMobile ? 'text-xs' : ''}>Shop</TableHead>
                    <TableHead className={isMobile ? 'text-xs' : ''}>Date</TableHead>
                    <TableHead className={`text-right ${isMobile ? 'text-xs' : ''}`}>Amount</TableHead>
                    <TableHead className={isMobile ? 'text-xs' : ''}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{order.shopName}</TableCell>
                      <TableCell className={isMobile ? 'text-xs' : ''}>{format(parseISO(order.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className={`text-right ${isMobile ? 'text-sm' : ''}`}>ETB {order.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            order.status === 'Pending' ? 'default' : 
                            order.status === 'Dispatched' ? 'secondary' : 
                            order.status === 'Delivered' ? 'outline' : 'destructive'
                          }
                          className={isMobile ? 'text-xs' : ''}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {metrics.recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No recent orders
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ResponsiveGridItem>
        
        <ResponsiveGridItem>
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
              <CardDescription>Products that need restocking</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isMobile ? 'text-xs' : ''}>Product</TableHead>
                    <TableHead className={isMobile ? 'text-xs' : ''}>Category</TableHead>
                    <TableHead className={`text-right ${isMobile ? 'text-xs' : ''}`}>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{item.name}</TableCell>
                      <TableCell className={isMobile ? 'text-xs' : ''}>{item.category}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className={isMobile ? 'text-xs' : ''}>{item.stock}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lowStockItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No low stock items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ResponsiveGridItem>
      </ResponsiveGrid>
    </div>
  );
}