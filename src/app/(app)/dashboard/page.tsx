
"use client";

import { useState } from "react";
import {
  ArrowDownUp,
  Building2,
  Package,
  Wallet,
  Trophy,
  TrendingUp,
  Star,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
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

// Mock Data based on the XML specification
const dashboardData = {
  metrics: {
    totalRevenue: 4523189.00,
    revenueChange: "+20.1%",
    registeredShops: 23,
    newShops: 5,
    totalProducts: 1257,
    newProducts: 12,
    activeOrders: 57,
    newOrders: 19,
  },
  recentOrders: [
    { id: "ORD-001", shopName: "Bole Boutique", location: "Addis Ababa", status: "Dispatched", amount: 25000.00, statusVariant: "outline" },
    { id: "ORD-002", shopName: "Hawassa Habesha", location: "Hawassa", status: "Awaiting Payment", amount: 15000.00, statusVariant: "default" },
    { id: "ORD-003", shopName: "Merkato Style", location: "Addis Ababa", status: "Rejected", amount: 35000.00, statusVariant: "destructive" },
    { id: "ORD-004", shopName: "Adama Modern", location: "Adama", status: "Fulfilled", amount: 45000.00, statusVariant: "secondary" },
  ],
};

const allProducts = [
    { 
        id: "MCT-001", 
        name: "Men's Classic Tee", 
        category: "Men", 
        price: 500.00,
        variants: [
            { id: "VAR-001", color: "White", size: "M", stock: 15 },
            { id: "VAR-002", color: "White", size: "L", stock: 10 },
            { id: "VAR-003", color: "Black", size: "M", stock: 20 },
            { id: "VAR-004", color: "Black", size: "XL", stock: 5 },
        ]
    },
    { 
        id: "WSD-012", 
        name: "Women's Summer Dress", 
        category: "Women", 
        price: 1200.00,
        variants: [
            { id: "VAR-005", color: "Floral", size: "S", stock: 8 },
            { id: "VAR-006", color: "Floral", size: "M", stock: 12 },
        ]
    },
    { 
        id: "KGH-034", 
        name: "Kid's Graphic Hoodie", 
        category: "Kids", 
        price: 850.00,
        variants: [
            { id: "VAR-007", color: "Blue", size: "6Y", stock: 18 },
            { id: "VAR-008", color: "Pink", size: "8Y", stock: 22 },
        ]
    },
    { 
        id: "UDJ-007", 
        name: "Unisex Denim Jacket", 
        category: "Unisex", 
        price: 2500.00,
        variants: [
            { id: "VAR-009", color: "Indigo", size: "L", stock: 7 },
        ]
    },
     { 
        id: "MST-002", 
        name: "Men's Striped Shirt", 
        category: "Men", 
        price: 950.00,
        variants: [
            { id: "VAR-010", color: "Navy/White", size: "M", stock: 14 },
            { id: "VAR-011", color: "Navy/White", size: "L", stock: 11 },
        ]
    },
    { 
        id: "WJP-005", 
        name: "Women's Jumpsuit", 
        category: "Women", 
        price: 1800.00,
        variants: [
            { id: "VAR-012", color: "Black", size: "S", stock: 9 },
            { id: "VAR-013", color: "Olive", size: "M", stock: 6 },
        ]
    },
];

const generateDate = (daysAgo: number) => subDays(new Date(), daysAgo);

const fullOrderHistory = [
    { date: generateDate(2), shopName: "Adama Modern", items: [{productId: "WSD-012", quantity: 20}, {productId: "UDJ-007", quantity: 10}] },
    { date: generateDate(5), shopName: "Bole Boutique", items: [{productId: "MCT-001", quantity: 50}, {productId: "MST-002", quantity: 30}] },
    { date: generateDate(8), shopName: "Hawassa Habesha", items: [{productId: "KGH-034", quantity: 25}] },
    { date: generateDate(12), shopName: "Merkato Style", items: [{productId: "WSD-012", quantity: 15}, {productId: "MCT-001", quantity: 20}] },
    { date: generateDate(15), shopName: "Adama Modern", items: [{productId: "WJP-005", quantity: 12}] },
    { date: generateDate(20), shopName: "Bole Boutique", items: [{productId: "UDJ-007", quantity: 15}, {productId: "KGH-034", quantity: 10}] },
    { date: generateDate(25), shopName: "Adama Modern", items: [{productId: "MCT-001", quantity: 40}] },
    { date: generateDate(35), shopName: "Merkato Style", items: [{productId: "MST-002", quantity: 20}, {productId: "WJP-005", quantity: 5}] },
    { date: generateDate(40), shopName: "Hawassa Habesha", items: [{productId: "WSD-012", quantity: 10}] },
];


const LOW_STOCK_THRESHOLD = 10;

const getLowStockItems = () => {
    const lowStockItems: { id: string; name: string; category: string; stock: number; isLow: boolean; }[] = [];
    allProducts.forEach(product => {
        product.variants.forEach(variant => {
            if (variant.stock < LOW_STOCK_THRESHOLD) {
                lowStockItems.push({
                    id: `${product.id}-${variant.id}`,
                    name: `${product.name} (${variant.color}, ${variant.size})`,
                    category: product.category,
                    stock: variant.stock,
                    isLow: true,
                });
            }
        });
    });
    return lowStockItems;
};

const getSalesMetrics = (dateRange?: DateRange) => {
    const productSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {};
    const shopPerformance: { [key: string]: number } = {};
    const productFrequency: { [key: string]: { name: string, count: number } } = {};
    const salesByDate: { [key: string]: number } = {};

    allProducts.forEach(p => {
        productSales[p.id] = { name: p.name, quantity: 0, revenue: p.price };
        productFrequency[p.id] = { name: p.name, count: 0 };
    });

    const filteredOrders = fullOrderHistory.filter(order => {
        if (!dateRange || !dateRange.from) return true;
        const to = dateRange.to || new Date();
        return order.date >= dateRange.from && order.date <= to;
    });

    filteredOrders.forEach(order => {
        if (!shopPerformance[order.shopName]) {
            shopPerformance[order.shopName] = 0;
        }
        
        const orderDate = format(order.date, "yyyy-MM-dd");
        if (!salesByDate[orderDate]) {
            salesByDate[orderDate] = 0;
        }

        let orderTotal = 0;
        order.items.forEach(item => {
            const itemRevenue = allProducts.find(p => p.id === item.productId)!.price * item.quantity;
            productSales[item.productId].quantity += item.quantity;
            shopPerformance[order.shopName] += itemRevenue;
            productFrequency[item.productId].count++;
            orderTotal += itemRevenue;
        });
        salesByDate[orderDate] += orderTotal;
    });

    const bestSelling = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .filter(p => p.quantity > 0);

    const topShop = Object.entries(shopPerformance)
        .sort((a, b) => b[1] - a[1])[0];

    const mostFrequent = Object.values(productFrequency)
        .sort((a, b) => b.count - a.count)
        .slice(0,5)
        .filter(p => p.count > 0);
    
    const salesChartData = Object.entries(salesByDate)
        .map(([date, total]) => ({ name: format(new Date(date), "MMM d"), total }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());


    return { bestSelling, topShop, mostFrequent, salesChartData };
}

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
allProducts.forEach(product => {
    chartConfig[product.name] = { label: product.name };
});


export default function DashboardPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { metrics, recentOrders } = dashboardData;
  const lowStockItems = getLowStockItems();
  const { bestSelling, topShop, mostFrequent, salesChartData } = getSalesMetrics(date);
  
  const totalFilteredRevenue = salesChartData.reduce((acc, item) => acc + item.total, 0);

  const bestSellingConfig = {
    quantity: { label: 'Quantity' },
    ...bestSelling.reduce((acc, item) => {
      acc[item.name] = { label: item.name };
      return acc;
    }, {})
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue (Filtered)
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {totalFilteredRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Total revenue for the selected period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registered Shops
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.registeredShops}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.newShops} since last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.newProducts} new products this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Orders
            </CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.activeOrders}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.newOrders} since last week
            </p>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>
              A summary of sales revenue for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full">
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `ETB ${value / 1000}k`}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>An overview of the most recent shop orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.shopName}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.statusVariant as any}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Products that are running low on inventory (less than {LOW_STOCK_THRESHOLD} items).</CardDescription>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.length > 0 ? (
                    lowStockItems.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>
                        <div className="font-medium">{item.name}</div>
                        </TableCell>
                        <TableCell>
                        {item.category}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${item.isLow ? 'text-destructive' : ''}`}>{item.stock}</TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                            No items are currently low on stock.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex-row items-center gap-4">
                <Trophy className="h-8 w-8" />
                <div>
                    <CardTitle>Top Performing Shop</CardTitle>
                    <CardDescription>By total sales volume</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
              {topShop ? (
                <>
                  <p className="text-3xl font-bold">{topShop[0]}</p>
                  <p className="text-muted-foreground">ETB {topShop[1].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in sales</p>
                </>
              ) : (
                <p className="text-muted-foreground">No sales in this period.</p>
              )}
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex-row items-center gap-4">
                <TrendingUp className="h-8 w-8" />
                <div>
                    <CardTitle>Best-Selling Products</CardTitle>
                    <CardDescription>Top products by quantity sold</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="h-[240px]">
              {bestSelling.length > 0 ? (
                 <ChartContainer config={bestSellingConfig}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          content={<ChartTooltipContent nameKey="name" />}
                        />
                        <Pie
                          data={bestSelling}
                          dataKey="quantity"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          }}
                        >
                          {bestSelling.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                 </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No sales in this period.</p>
                </div>
              )}
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex-row items-center gap-4">
                <Star className="h-8 w-8" />
                <div>
                    <CardTitle>Most Frequent</CardTitle>
                    <CardDescription>Top 5 most ordered products</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
              {mostFrequent.length > 0 ? (
                <ol className="list-decimal list-inside space-y-2">
                    {mostFrequent.map(item => (
                        <li key={item.name} className="font-medium">
                            {item.name} <span className="text-sm text-muted-foreground">({item.count} orders)</span>
                        </li>
                    ))}
                </ol>
              ) : (
                <p className="text-muted-foreground">No orders in this period.</p>
              )}
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
