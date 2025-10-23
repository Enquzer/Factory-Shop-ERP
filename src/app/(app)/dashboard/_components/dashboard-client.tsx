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
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [shops, setShops] = useState(initialShops);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [lowStockItems, setLowStockItems] = useState(initialLowStockItems);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Add timestamp to bust cache
      const timestamp = Date.now();
      // Fetch fresh data
      const [freshProducts, freshOrders, freshShops] = await Promise.all([
        fetch(`/api/products?t=${timestamp}`).then(res => res.json()),
        fetch(`/api/orders?t=${timestamp}`).then(res => res.json()),
        fetch(`/api/shops?t=${timestamp}`).then(res => res.json())
      ]);

      setProducts(freshProducts);
      setOrders(freshOrders);
      setShops(freshShops);

      // Update metrics
      const freshMetrics = {
        totalProducts: freshProducts.length,
        registeredShops: freshShops.length,
        activeOrders: freshOrders.filter((o: Order) => o.status === 'Pending' || o.status === 'Dispatched').length,
        recentOrders: freshOrders.slice(0, 4)
      };
      setMetrics(freshMetrics);

      // Update low stock items
      const freshLowStockItems = getLowStockItems(freshProducts);
      setLowStockItems(freshLowStockItems);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getLowStockItems = (products: Product[]) => {
    const lowStockItems: { id: string; name: string; category: string; stock: number; isLow: boolean; }[] = [];
    products.forEach(product => {
        const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
        const minStock = product.minimumStockLevel ?? 10 * product.variants.length;
        
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
    const productSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {};
    const shopPerformance: { [key: string]: number } = {};
    const productFrequency: { [key: string]: { name: string, count: number } } = {};
    const salesByDate: { [key: string]: number } = {};

    products.forEach(p => {
        productSales[p.id] = { name: p.name, quantity: 0, revenue: p.price };
        productFrequency[p.id] = { name: p.name, count: 0 };
    });

    const filteredOrders = orders.filter(order => {
        if (!dateRange || !dateRange.from) return true;
        const to = dateRange.to || new Date();
        const orderDate = parseISO(order.date);
        return orderDate >= dateRange.from && orderDate <= to;
    });

    filteredOrders.forEach(order => {
        if (!shopPerformance[order.shopName]) {
            shopPerformance[order.shopName] = 0;
        }
        
        const orderDate = format(parseISO(order.date), "yyyy-MM-dd");
        if (!salesByDate[orderDate]) {
            salesByDate[orderDate] = 0;
        }

        order.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
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
                className={cn(
                  "w-full sm:w-[300px] justify-start text-left font-normal",
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
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered Shops</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.registeredShops}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {salesData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={salesData} width={653} height={300}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  />
                  <YAxis
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {bestSelling.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart width={653} height={300}>
                  <Tooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={bestSelling}
                    dataKey="quantity"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {bestSelling.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No product sales data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Orders and Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from your shops</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.shopName}</TableCell>
                    <TableCell>{format(parseISO(order.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right">ETB {order.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        order.status === 'Pending' ? 'default' : 
                        order.status === 'Dispatched' ? 'secondary' : 
                        order.status === 'Delivered' ? 'outline' : 'destructive'
                      }>
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
        
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{item.stock}</Badge>
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
      </div>
    </div>
  );
}