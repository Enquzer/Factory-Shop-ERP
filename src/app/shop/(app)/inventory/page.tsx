
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Wallet } from 'lucide-react';
import { useOrder } from '@/hooks/use-order';
import { getShopInventory, type ShopInventoryItem } from '@/lib/shop-inventory';

const LOW_STOCK_THRESHOLD = 5;

export default function ShopInventoryPage() {
    const { shopId } = useOrder();
    const [inventory, setInventory] = useState<ShopInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!shopId) return;
        const fetchInventory = async () => {
            setIsLoading(true);
            const inventoryData = await getShopInventory(shopId);
            setInventory(inventoryData);
            setIsLoading(false);
        };
        fetchInventory();
    }, [shopId]);
    
    const { totalInventoryValue, totalInventoryAmount } = useMemo(() => {
        const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
        const totalAmount = inventory.reduce((sum, item) => sum + item.stock, 0);
        return { totalInventoryValue: totalValue, totalInventoryAmount: totalAmount };
    }, [inventory]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">My Inventory</h1>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Amount</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalInventoryAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total units in your stock</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ETB {totalInventoryValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</div>
                        <p className="text-xs text-muted-foreground">Total value of your stock (based on factory price)</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Stock Details</CardTitle>
                    <CardDescription>An overview of the items you have in stock.</CardDescription>
                </CardHeader>
                <CardContent>
                    {inventory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Variant</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Subtotal Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inventory.map(item => (
                                    <TableRow key={`${item.productId}-${item.variant.id}`}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.variant.color}, {item.variant.size}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={item.stock > LOW_STOCK_THRESHOLD ? 'outline' : 'destructive'}>
                                                {item.stock}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">ETB {item.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-semibold">ETB {(item.price * item.stock).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                         <div className="text-center py-12 text-muted-foreground">
                            <p>Your inventory is empty.</p>
                             <p className="text-sm">Confirm receipt of dispatched orders to populate your inventory.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
