
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
import { ordersStore, type Order, type OrderItem } from "@/lib/orders";
import { getStockEventsForProduct, type StockEvent } from "@/lib/stock-events";
import { format, parseISO } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, Package, DollarSign } from "lucide-react";
import { Badge } from "./ui/badge";

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
            
            // Fetch Sales History from Orders
            const allOrders = ordersStore.allOrders;
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
            setSalesHistory(productSales.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
            
            // Fetch Replenishment History
            const stockEvents = await getStockEventsForProduct(product.id);
            setReplenishmentHistory(stockEvents.filter(e => e.type === 'Stock In'));

            setIsLoading(false);
        };

        fetchHistory();
    }, [product]);

    const metrics = useMemo(() => {
        const totalUnitsSold = salesHistory.reduce((sum, item) => sum + item.quantity, 0);
        const totalRevenue = salesHistory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return {
            totalUnitsSold,
            totalRevenue,
        }
    }, [salesHistory]);

    const getVariantDetails = (variantId: string) => {
        return product.variants.find(v => v.id === variantId);
    }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
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
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ETB {metrics.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
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
                        <div className="text-2xl font-bold">{product.variants.reduce((sum, v) => sum + v.stock, 0)}</div>
                    </CardContent>
                </Card>
            </div>


            <Tabs defaultValue="sales" className="w-full">
                <TabsList>
                    <TabsTrigger value="sales">Sales History</TabsTrigger>
                    <TabsTrigger value="replenishments">Replenishment History</TabsTrigger>
                </TabsList>
                <ScrollArea className="h-[40vh] mt-4 pr-4">
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
                                        <TableCell>{format(parseISO(item.date), "dd MMM, yyyy")}</TableCell>
                                        <TableCell>{item.shopName}</TableCell>
                                        <TableCell>{item.variant.color}, {item.variant.size}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-medium">ETB {(item.price * item.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No sales recorded yet.</TableCell>
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
                                        <TableCell>{format(event.createdAt, "dd MMM, yyyy")}</TableCell>
                                        <TableCell>{variant ? `${variant.color}, ${variant.size}` : 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{event.reason}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">+{event.quantity}</TableCell>
                                    </TableRow>
                                )}) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No replenishments recorded yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
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
