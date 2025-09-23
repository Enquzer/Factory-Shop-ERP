
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOrder } from '@/hooks/use-order';
import { ShoppingCart, Target, DollarSign, Loader2 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { getShopById, type Shop } from '@/lib/shops';
import { parseISO, startOfWeek, format, isThisMonth } from 'date-fns';

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
};

export default function ShopAnalyticsPage() {
    const { orders, shopId, isLoading: isOrdersLoading } = useOrder();
    const [shop, setShop] = useState<Shop | null>(null);
    const [isShopLoading, setIsShopLoading] = useState(true);

    useEffect(() => {
        const fetchShop = async () => {
            if (shopId) {
                setIsShopLoading(true);
                const shopData = await getShopById(shopId);
                setShop(shopData);
                setIsShopLoading(false);
            }
        };
        fetchShop();
    }, [shopId]);

    const analytics = useMemo(() => {
        if (!shop || isOrdersLoading) return {
            totalOrders: 0,
            totalSpent: 0,
            targetProgress: 0,
            targetAmount: 0,
            weeklySalesData: []
        };

        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
        
        const monthlySales = orders.reduce((sum, order) => {
            if (isThisMonth(parseISO(order.date))) {
                return sum + order.amount;
            }
            return sum;
        }, 0);

        const targetAmount = shop.monthlySalesTarget || 0;
        const targetProgress = targetAmount > 0 ? (monthlySales / targetAmount) * 100 : 0;

        const weeklySales: { [key: string]: number } = {};
        const currentMonthOrders = orders.filter(o => isThisMonth(parseISO(o.date)));

        currentMonthOrders.forEach(order => {
            const weekStart = format(startOfWeek(parseISO(order.date), { weekStartsOn: 1 }), "MMM d");
            if (!weeklySales[weekStart]) {
                weeklySales[weekStart] = 0;
            }
            weeklySales[weekStart] += order.amount;
        });

        const weeklySalesData = Object.entries(weeklySales)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());


        return {
            totalOrders,
            totalSpent,
            targetProgress,
            targetAmount,
            weeklySalesData,
        };

    }, [orders, shop, isOrdersLoading]);
    
    const isLoading = isOrdersLoading || isShopLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">My Analytics</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders Placed</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">All-time orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ETB {analytics.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
               <p className="text-xs text-muted-foreground">All-time spending</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month's Sales Goal</CardTitle>
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

        <Card>
            <CardHeader>
                <CardTitle>Weekly Sales</CardTitle>
                <CardDescription>Your shop's sales performance for each week of the current month.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                 {analytics.weeklySalesData.length > 0 ? (
                    <ChartContainer config={chartConfig}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.weeklySalesData}>
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
                            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                 ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No sales data for this month yet.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
      </div>
    )
  }
