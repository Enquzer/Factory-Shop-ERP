
"use client";

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShoppingCart, Target, DollarSign, Package, CheckCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { type Shop } from '@/lib/shops';
import { type Order } from '@/lib/orders';
import { parseISO, startOfWeek, format, isThisMonth } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
};

const GrowthIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const isZero = Math.abs(value) < 0.01;

    if (isZero) {
        return <span className="text-muted-foreground">0%</span>
    }

    return (
        <span className={`flex items-center font-semibold ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4 mr-1"/> : <TrendingDown className="h-4 w-4 mr-1"/>}
            {value.toFixed(1)}%
        </span>
    )
};

type ShopAnalyticsClientPageProps = {
    shop: Shop;
    orders: Order[];
}

export function ShopAnalyticsClientPage({ shop, orders }: ShopAnalyticsClientPageProps) {
    const analytics = useMemo(() => {
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
        const totalItemsOrdered = orders.reduce((sum, order) => sum + order.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
        const totalItemsDelivered = orders
            .filter(o => o.status === 'Delivered')
            .reduce((sum, order) => sum + order.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
        
        const monthlySales = orders.reduce((sum, order) => {
            if (isThisMonth(parseISO(order.date))) {
                return sum + order.amount;
            }
            return sum;
        }, 0);

        const targetAmount = shop.monthlySalesTarget || 0;
        const targetProgress = targetAmount > 0 ? (monthlySales / targetAmount) * 100 : 0;

        // Chart Data
        const weeklySales: { [key: string]: number } = {};
        const currentMonthOrders = orders.filter(o => isThisMonth(parseISO(o.date)));
        currentMonthOrders.forEach(order => {
            const weekStart = format(startOfWeek(parseISO(order.date), { weekStartsOn: 1 }), "MMM d");
            if (!weeklySales[weekStart]) { weeklySales[weekStart] = 0; }
            weeklySales[weekStart] += order.amount;
        });
        const weeklySalesData = Object.entries(weeklySales)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        const monthlySalesByDay: { [key: string]: number } = {};
        currentMonthOrders.forEach(order => {
            const day = format(parseISO(order.date), "MMM d");
            if (!monthlySalesByDay[day]) { monthlySalesByDay[day] = 0; }
            monthlySalesByDay[day] += order.amount;
        });
        const monthlySalesData = Object.entries(monthlySalesByDay)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());

        // WoW Comparison is complex with server components, simplified for now
        const weekOverWeekSales = 0; // Placeholder

        // Top Products
        const productCounts: {[key: string]: { name: string, count: number }} = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productCounts[item.productId]) {
                    productCounts[item.productId] = { name: item.name, count: 0 };
                }
                productCounts[item.productId].count += item.quantity;
            });
        });
        const topProducts = Object.values(productCounts).sort((a,b) => b.count - a.count).slice(0, 5);


        return {
            totalOrders,
            totalSpent,
            totalItemsOrdered,
            totalItemsDelivered,
            targetProgress,
            targetAmount,
            weeklySalesData,
            monthlySalesData,
            weekOverWeekSales,
            topProducts,
        };

    }, [orders, shop]);
    
    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">All-time orders placed</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items Ordered</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalItemsOrdered}</div>
              <p className="text-xs text-muted-foreground">All-time units ordered</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items Delivered</CardTitle>
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalItemsDelivered}</div>
              <p className="text-xs text-muted-foreground">All-time units received</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WoW Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><GrowthIndicator value={analytics.weekOverWeekSales} /></div>
               <p className="text-xs text-muted-foreground">vs. last week</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Goal</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {analytics.targetAmount > 0 ? (
                <>
                  <div className="text-2xl font-bold">{analytics.targetProgress.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    ETB {analytics.targetAmount.toLocaleString()} target
                  </p>
                  <Progress value={analytics.targetProgress} className="mt-2 h-2" />
                </>
              ) : (
                <p className="text-sm text-muted-foreground pt-2">No sales target set.</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
                <CardHeader>
                    <CardTitle>Sales Performance</CardTitle>
                    <CardDescription>Your shop's sales performance over time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="monthly">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        </TabsList>
                        <TabsContent value="monthly" className="h-[350px] pt-4">
                            {analytics.monthlySalesData.length > 0 ? (
                                <ChartContainer config={chartConfig}>
                                    <BarChart data={analytics.monthlySalesData} width={653} height={350}>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `ETB ${v / 1000}k`} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No sales data for this month yet.</p></div>
                            )}
                        </TabsContent>
                         <TabsContent value="weekly" className="h-[350px] pt-4">
                            {analytics.weeklySalesData.length > 0 ? (
                                <ChartContainer config={chartConfig}>
                                    <BarChart data={analytics.weeklySalesData} width={653} height={350}>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `ETB ${v / 1000}k`} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No sales data for this month yet.</p></div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>Your most ordered products (all-time by quantity).</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {analytics.topProducts.length > 0 ? (
                            analytics.topProducts.map((product) => (
                                <TableRow key={product.name}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-right">{product.count}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    No products ordered yet.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </>
    )
}
