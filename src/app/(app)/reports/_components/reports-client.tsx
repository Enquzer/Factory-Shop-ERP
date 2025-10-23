"use client";

import { useMemo, useEffect, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Package, Wallet, Loader2 } from "lucide-react";
import { type Product } from "@/lib/products";
import { type Shop } from "@/lib/shops";
import { type Order } from "@/lib/orders";

type ShopPerformance = {
    id: string;
    name: string;
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
    target?: number;
    progress: number;
}

type ReportsClientPageProps = {
    products: Product[];
    shops: Shop[];
    orders: Order[];
}

export function ReportsClientPage({ products, shops, orders }: ReportsClientPageProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [refreshedOrders, setRefreshedOrders] = useState<Order[]>(orders);
    const [refreshedShops, setRefreshedShops] = useState<Shop[]>(shops);
    const [refreshedProducts, setRefreshedProducts] = useState<Product[]>(products);

    // Fetch fresh data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch fresh orders
                const ordersResponse = await fetch('/api/orders');
                if (ordersResponse.ok) {
                    const ordersData = await ordersResponse.json();
                    setRefreshedOrders(ordersData);
                }
                
                // Fetch fresh shops
                const shopsResponse = await fetch('/api/shops');
                if (shopsResponse.ok) {
                    const shopsData = await shopsResponse.json();
                    // Handle both array and paginated response formats
                    const shopsArray = Array.isArray(shopsData) 
                        ? shopsData 
                        : (shopsData.shops || []);
                    setRefreshedShops(shopsArray);
                }
                
                // Fetch fresh products
                const productsResponse = await fetch('/api/products');
                if (productsResponse.ok) {
                    const productsData = await productsResponse.json();
                    setRefreshedProducts(productsData);
                }
            } catch (error) {
                console.error('Error fetching fresh data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const kpis = useMemo(() => {
        // Use refreshed data instead of props data
        const currentProducts = refreshedProducts;
        const currentShops = refreshedShops;
        const currentOrders = refreshedOrders;

        // Inventory KPIs
        const totalInventoryAmount = currentProducts.reduce((acc, p) => acc + p.variants.reduce((vAcc, v) => vAcc + v.stock, 0), 0);
        const totalInventoryValue = currentProducts.reduce((acc, p) => acc + p.variants.reduce((vAcc, v) => vAcc + (v.stock * p.price), 0), 0);

        // Sales comparison KPIs
        const now = new Date();
        const startOfThisMonth = startOfMonth(now);
        const endOfThisMonth = endOfMonth(now);
        const startOfLastMonth = startOfMonth(subMonths(now, 1));
        const endOfLastMonth = endOfMonth(subMonths(now, 1));
        
        // Filter orders by date range
        const thisMonthOrders = currentOrders.filter(o => {
            const orderDate = parseISO(o.date);
            return isWithinInterval(orderDate, { start: startOfThisMonth, end: endOfThisMonth });
        });
        
        const lastMonthOrders = currentOrders.filter(o => {
            const orderDate = parseISO(o.date);
            return isWithinInterval(orderDate, { start: startOfLastMonth, end: endOfLastMonth });
        });
        
        // Calculate sales amounts
        const thisMonthSales = thisMonthOrders.reduce((sum, o) => sum + o.amount, 0);
        const lastMonthSales = lastMonthOrders.reduce((sum, o) => sum + o.amount, 0);

        // Calculate month-over-month growth
        let monthOverMonthSales = 0;
        if (lastMonthSales > 0) {
            monthOverMonthSales = ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100;
        } else if (thisMonthSales > 0) {
            monthOverMonthSales = 100; // 100% growth from zero
        }
        
        const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
        const startOfLastWeek = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const endOfLastWeek = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        
        // Filter orders by week
        const thisWeekOrders = currentOrders.filter(o => {
            const orderDate = parseISO(o.date);
            return isWithinInterval(orderDate, { start: startOfThisWeek, end: endOfThisWeek });
        });
        
        const lastWeekOrders = currentOrders.filter(o => {
            const orderDate = parseISO(o.date);
            return isWithinInterval(orderDate, { start: startOfLastWeek, end: endOfLastWeek });
        });
        
        // Calculate weekly sales
        const thisWeekSales = thisWeekOrders.reduce((sum, o) => sum + o.amount, 0);
        const lastWeekSales = lastWeekOrders.reduce((sum, o) => sum + o.amount, 0);

        // Calculate week-over-week growth
        let weekOverWeekSales = 0;
        if (lastWeekSales > 0) {
            weekOverWeekSales = ((thisWeekSales - lastWeekSales) / lastWeekSales) * 100;
        } else if (thisWeekSales > 0) {
            weekOverWeekSales = 100; // 100% growth from zero
        }

        // Shop performance
        // Ensure currentShops is an array before using map
        const shopPerformance: ShopPerformance[] = Array.isArray(currentShops) 
            ? currentShops.map(shop => {
                 const shopOrders = currentOrders.filter(o => o.shopId === shop.id);
                 const currentMonthShopOrders = shopOrders.filter(o => {
                    const orderDate = parseISO(o.date);
                    return isWithinInterval(orderDate, { start: startOfThisMonth, end: endOfThisMonth });
                 });

                 const totalRevenue = currentMonthShopOrders.reduce((sum, o) => sum + o.amount, 0);
                 const totalItems = currentMonthShopOrders.reduce((sum, o) => sum + o.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
                 const progress = shop.monthlySalesTarget ? (totalRevenue / shop.monthlySalesTarget) * 100 : 0;

                 return {
                     id: shop.id,
                     name: shop.name,
                     totalOrders: currentMonthShopOrders.length,
                     totalRevenue,
                     totalItems,
                     target: shop.monthlySalesTarget,
                     progress: Math.min(100, progress),
                 }
            }).sort((a, b) => b.totalRevenue - a.totalRevenue)
            : [];

        return { 
            totalInventoryAmount, 
            totalInventoryValue, 
            monthOverMonthSales, 
            weekOverWeekSales, 
            shopPerformance,
            // For debugging
            orderCounts: {
                total: currentOrders.length,
                thisMonth: thisMonthOrders.length,
                lastMonth: lastMonthOrders.length,
                thisWeek: thisWeekOrders.length,
                lastWeek: lastWeekOrders.length
            }
        };

    }, [refreshedProducts, refreshedOrders, refreshedShops]);
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

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

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Reports & Analytics</h1>
                <button 
                    onClick={() => window.location.reload()} 
                    className="text-sm text-primary hover:underline"
                >
                    Refresh Data
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Month-over-Month</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><GrowthIndicator value={kpis.monthOverMonthSales} /></div>
                        <p className="text-xs text-muted-foreground">Sales growth vs. last month</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Week-over-Week</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><GrowthIndicator value={kpis.weekOverWeekSales} /></div>
                        <p className="text-xs text-muted-foreground">Sales growth vs. last week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Amount</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis.totalInventoryAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total units in stock</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ETB {kpis.totalInventoryValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                        <p className="text-xs text-muted-foreground">Total value of stock</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Shop Performance</CardTitle>
                    <CardDescription>
                        An overview of each shop's sales performance for the current month.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Shop</TableHead>
                                <TableHead>Monthly Target</TableHead>
                                <TableHead>Revenue</TableHead>
                                <TableHead>Orders</TableHead>
                                <TableHead>Items Sold</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {kpis.shopPerformance.length > 0 ? (
                                kpis.shopPerformance.map((shop) => (
                                    <TableRow key={shop.id}>
                                        <TableCell className="font-medium">{shop.name}</TableCell>
                                        <TableCell>
                                            {shop.target ? (
                                                <div className="flex flex-col gap-2">
                                                    <p>ETB {shop.target.toLocaleString()}</p>
                                                    <Progress value={shop.progress} className="h-2"/>
                                                    <p className="text-xs text-muted-foreground">{shop.progress.toFixed(1)}% of target</p>
                                                </div>
                                            ): (
                                                <p className="text-muted-foreground text-sm">Not set</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-semibold">ETB {shop.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                                        <TableCell>{shop.totalOrders}</TableCell>
                                        <TableCell>{shop.totalItems}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        No shop data to display.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}