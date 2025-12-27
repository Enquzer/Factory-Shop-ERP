"use client";

import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "./ui/scroll-area";
import { getStockEventsForProduct, type StockEvent } from "@/lib/stock-events";
import { format, parseISO } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react";
import { Badge } from "./ui/badge";

// Define the Order type locally since we can't import it from orders.ts on the client
type OrderItem = {
  productId: string;
  variant: {
    id: string;
    color: string;
    size: string;
  };
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  shopId: string;
  shopName: string;
  date: string;
  status: string;
  amount: number;
  items: OrderItem[];
  createdAt: Date;
};

type SalesHistoryItem = OrderItem & {
    orderId: string;
    shopName: string;
    date: string;
};

export function ProductHistoryDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {
    const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
    const [replenishmentHistory, setReplenishmentHistory] = useState<StockEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!product) return;

        const fetchHistory = async () => {
            setIsLoading(true);
            
            try {
                // Get the auth token from localStorage (this is a simplified approach)
                const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
                const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
                
                // Fetch Sales History from Orders API
                const ordersResponse = await fetch('/api/orders', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
                });
                if (ordersResponse.ok) {
                    const allOrders: Order[] = await ordersResponse.json();
                    const productSales: SalesHistoryItem[] = [];
                    allOrders.forEach(order => {
                        order.items.forEach(item => {
                            if (item.productId === product.id) {
                                productSales.push({
                                    ...item,
                                    orderId: order.id,
                                    shopName: order.shopName,
                                    date: order.date,
                                });
                            }
                        });
                    });
                    // Sort by date, handling potential date format issues
                    setSalesHistory(productSales.sort((a,b) => {
                        const dateA = new Date(a.date);
                        const dateB = new Date(b.date);
                        // Check if dates are valid
                        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                            return 0;
                        }
                        return dateB.getTime() - dateA.getTime();
                    }));
                } else if (ordersResponse.status === 401) {
                    console.error("Unauthorized access to orders API");
                } else {
                    console.error("Failed to fetch orders:", ordersResponse.status);
                }
                
                // Fetch Replenishment History
                const stockEventsResponse = await fetch(`/api/stock-events?productId=${product.id}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
                });
                if (stockEventsResponse.ok) {
                    const stockEvents: StockEvent[] = await stockEventsResponse.json();
                    // Sort by createdAt date
                    const sortedEvents = stockEvents
                        .filter(e => e.type === 'Stock In')
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setReplenishmentHistory(sortedEvents);
                } else if (stockEventsResponse.status === 401) {
                    console.error("Unauthorized access to stock events API");
                } else {
                    console.error("Failed to fetch stock events:", stockEventsResponse.status);
                }
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [product]);

    const metrics = useMemo(() => {
        // Calculate total units sold
        const totalUnitsSold = salesHistory.reduce((sum, item) => {
            return sum + (item.quantity || 0);
        }, 0);
        
        // Calculate total revenue
        const totalRevenue = salesHistory.reduce((sum, item) => {
            const quantity = item.quantity || 0;
            const price = item.price || 0;
            return sum + (quantity * price);
        }, 0);
        
        // Calculate current stock
        const currentStock = product.variants.reduce((sum, variant) => {
            return sum + (variant.stock || 0);
        }, 0);
        
        return {
            totalUnitsSold,
            totalRevenue,
            currentStock
        }
    }, [salesHistory, product.variants]);

    const getVariantDetails = (variantId: string) => {
        return product.variants.find(v => v.id === variantId);
    }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transaction History: {product.name}</DialogTitle>
          <DialogDescription>
            A complete log of sales and replenishments for this product.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ETB {metrics.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Units Sold</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalUnitsSold}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.currentStock}</div>
                    </CardContent>
                </Card>
            </div>


            <Tabs defaultValue="sales" className="w-full flex-1 flex flex-col">
                <TabsList>
                    <TabsTrigger value="sales">Sales History</TabsTrigger>
                    <TabsTrigger value="replenishments">Replenishment History</TabsTrigger>
                    {product.agePricing && product.agePricing.length > 0 && (
                        <TabsTrigger value="pricing">Age-Based Pricing</TabsTrigger>
                    )}
                </TabsList>
                <ScrollArea className="flex-1 mt-4 pr-4">
                    <TabsContent value="sales">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Shop</TableHead>
                                    <TableHead>Variant</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salesHistory.length > 0 ? salesHistory.map((item, index) => (
                                    <TableRow key={`${item.orderId}-${item.variant.id}-${index}`}>
                                        <TableCell>{format(new Date(item.date), "dd MMM, yyyy")}</TableCell>
                                        <TableCell>{item.shopName}</TableCell>
                                        <TableCell>{item.variant.color}, {item.variant.size}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-medium">ETB {(item.price * item.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No sales recorded yet for this product.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="replenishments">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Variant</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Quantity In</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {replenishmentHistory.length > 0 ? replenishmentHistory.map((event) => {
                                    const variant = getVariantDetails(event.variantId);
                                    return (
                                     <TableRow key={event.id}>
                                        <TableCell>{format(new Date(event.createdAt), "dd MMM, yyyy")}</TableCell>
                                        <TableCell>{variant ? `${variant.color}, ${variant.size}` : 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{event.reason}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">+{event.quantity}</TableCell>
                                    </TableRow>
                                )}) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            No replenishments recorded yet for this product.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    {product.agePricing && product.agePricing.length > 0 && (
                        <TabsContent value="pricing">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Age Range</TableHead>
                                        <TableHead className="text-right">Price (ETB)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {product.agePricing.map((pricing) => (
                                        <TableRow key={pricing.id}>
                                            <TableCell>{pricing.ageMin} - {pricing.ageMax} years</TableCell>
                                            <TableCell className="text-right font-medium">ETB {pricing.price.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    )}
                </ScrollArea>
            </Tabs>
        </>
        )}

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}