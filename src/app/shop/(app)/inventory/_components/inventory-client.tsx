"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type ShopInventoryItem } from '@/lib/shop-inventory';
import Image from "next/image";
import { Factory, Store } from "lucide-react";
import { useState, useEffect } from "react";

const LOW_STOCK_THRESHOLD = 5;

export function InventoryClientPage({ inventory }: { inventory: ShopInventoryItem[] }) {
    const [factoryStock, setFactoryStock] = useState<Record<string, number>>({});
    
    // Fetch factory stock for each inventory item
    useEffect(() => {
        const fetchFactoryStock = async () => {
            const stockMap: Record<string, number> = {};
            
            for (const item of inventory) {
                try {
                    const response = await fetch(`/api/factory-stock?variantId=${item.productVariantId}`);
                    if (response.ok) {
                        const data = await response.json();
                        stockMap[item.productVariantId] = data.factoryStock;
                    }
                } catch (error) {
                    console.error(`Error fetching factory stock for variant ${item.productVariantId}:`, error);
                }
            }
            
            setFactoryStock(stockMap);
        };
        
        if (inventory.length > 0) {
            fetchFactoryStock();
        }
    }, [inventory]);
    
    return (
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
                                <TableHead className="text-right">Stock Levels</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Subtotal Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.map(item => {
                                // Determine stock status
                                let stockVariant: "outline" | "destructive" | "secondary" = 'outline';
                                let stockText = item.stock.toString();
                                
                                if (item.stock <= 0) {
                                    stockVariant = 'destructive';
                                    stockText = 'Out of Stock';
                                } else if (item.stock <= LOW_STOCK_THRESHOLD) {
                                    stockVariant = 'destructive';
                                    stockText = `${item.stock} (Low Stock)`;
                                }
                                
                                const factoryStockForItem = factoryStock[item.productVariantId] ?? item.stock;
                                
                                return (
                                    <TableRow key={`${item.productId}-${item.productVariantId}`}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {item.imageUrl ? (
                                                    <div className="relative h-10 w-8 rounded overflow-hidden">
                                                        <Image 
                                                            src={item.imageUrl} 
                                                            alt={item.name} 
                                                            fill 
                                                            className="object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.src = '/placeholder-product.png';
                                                            }}
                                                            unoptimized={true}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="bg-muted border rounded w-8 h-10 flex items-center justify-center">
                                                        <span className="text-xs">?</span>
                                                    </div>
                                                )}
                                                <span>{item.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{item.color}, {item.size}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Store className="h-3 w-3 text-green-500" />
                                                    <Badge variant={stockVariant} className="text-xs">
                                                        Your Stock: {stockText}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Factory className="h-3 w-3 text-blue-500" />
                                                    <Badge variant="outline" className="text-xs">
                                                        Factory: {factoryStockForItem}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">ETB {item.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-semibold">ETB {(item.price * item.stock).toFixed(2)}</TableCell>
                                    </TableRow>
                                );
                            })}
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
    );
}