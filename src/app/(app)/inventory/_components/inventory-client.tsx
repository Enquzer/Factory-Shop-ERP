import { useState, useEffect } from 'react';
"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type Product } from "@/lib/products";
import Image from "next/image";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export function InventoryClientPage({ products }: { products: Product[] }) {
    
    const getTotalStock = (variants: { stock: number }[]) => {
        return variants.reduce((total, variant) => total + variant.stock, 0);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>An overview of the stock levels for each product and its variants.</CardDescription>
            </CardHeader>
            <CardContent>
                {products.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {products.map(product => {
                            const totalStock = getTotalStock(product.variants);
                            const minStockLevel = product.minimumStockLevel ?? (DEFAULT_LOW_STOCK_THRESHOLD * product.variants.length);
                            const isLowStock = totalStock > 0 && totalStock < minStockLevel;

                            return (
                                <AccordionItem value={product.id} key={product.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="relative h-16 w-12 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                                                <Image 
                                                    src={product.imageUrl || '/placeholder-product.png'} 
                                                    alt={product.name} 
                                                    fill 
                                                    className="object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/placeholder-product.png';
                                                    }}
                                                    unoptimized={true}
                                                    loading="eager"
                                                />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <span className="font-medium">{product.name}</span>
                                            </div>
                                            <Badge variant={isLowStock ? 'destructive' : 'secondary'} className="ml-auto">
                                                Total Stock: {totalStock}
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        {/* Variant Images Gallery */}
                                        {product.variants.some(v => v.imageUrl) && (
                                            <div className="mb-4">
                                                <h4 className="font-medium mb-2">Variant Images</h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                    {product.variants.map(variant => (
                                                        variant.imageUrl && (
                                                            <div key={variant.id} className="relative aspect-square rounded-md overflow-hidden border">
                                                                <Image 
                                                                    src={variant.imageUrl} 
                                                                    alt={`${product.name} - ${variant.color}, ${variant.size}`} 
                                                                    fill 
                                                                    style={{objectFit: 'cover'}} 
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.src = '/placeholder-product.png';
                                                                    }}
                                                                    unoptimized={true}
                                                                    loading="eager"
                                                                />
                                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                                                                    {variant.color}, {variant.size}
                                                                </div>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Color</TableHead>
                                                    <TableHead>Size</TableHead>
                                                    <TableHead className="text-right">Stock Quantity</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {product.variants.map(variant => (
                                                    <TableRow key={variant.id}>
                                                        <TableCell>{variant.color}</TableCell>
                                                        <TableCell>{variant.size}</TableCell>
                                                        <TableCell className={`text-right font-medium ${variant.stock < (product.minimumStockLevel ?? DEFAULT_LOW_STOCK_THRESHOLD) ? 'text-destructive' : ''}`}>
                                                            {variant.stock}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                     <div className="text-center py-12 text-muted-foreground">
                        <p>No products found in inventory.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}