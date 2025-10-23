"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type ShopInventoryItem } from '@/lib/shop-inventory';
import Image from "next/image";

const LOW_STOCK_THRESHOLD = 5;

export function InventoryClientPage({ inventory }: { inventory: ShopInventoryItem[] }) {
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
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Subtotal Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.map(item => (
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
                                        <Badge variant={item.stock > LOW_STOCK_THRESHOLD ? 'outline' : item.stock > 0 ? 'destructive' : 'secondary'}>
                                            {item.stock > 0 ? item.stock : 'Out of Stock'}
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
    );
}