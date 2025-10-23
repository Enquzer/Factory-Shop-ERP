"use client";

import { useOrder } from "@/hooks/use-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";


export default function CreateOrderPage() {
    const { items, updateQuantity, removeItem, clearOrder, totalAmount, placeOrder, shopDiscount, getAvailableStock } = useOrder();
    
    const handlePlaceOrder = () => {
        placeOrder();
    }

    // Calculate available stock considering items already in the order
    const getRealTimeAvailableStock = (variantId: string) => {
        const inventoryStock = getAvailableStock(variantId);
        const orderedQuantity = items
            .filter(item => item.variant.id === variantId)
            .reduce((sum, item) => sum + item.quantity, 0);
        return inventoryStock - orderedQuantity;
    };

    const finalAmount = totalAmount * (1 - shopDiscount);

    if (items.length === 0) {
        return (
             <div className="flex flex-col gap-6 items-center justify-center text-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Your Order is Empty</CardTitle>
                        <CardDescription>
                            You haven't added any products to your order yet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Browse the product catalog to get started.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/shop/products">Browse Products</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Create New Order</h1>
                 <Button variant="outline" onClick={clearOrder}>Clear Order</Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                    <CardDescription>Review and adjust your items before placing the order.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="hidden md:table-cell">Image</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="w-[120px]">Quantity</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => {
                                const availableStock = getRealTimeAvailableStock(item.variant.id);
                                const isLowStock = availableStock < item.quantity;
                                
                                return (
                                    <TableRow key={item.variant.id}>
                                        <TableCell className="hidden md:table-cell">
                                             <Image 
                                                src={item.imageUrl || '/placeholder-product.png'} 
                                                alt={item.name} 
                                                width={64} 
                                                height={80} 
                                                className="rounded-md object-cover"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = '/placeholder-product.png';
                                                }}
                                                unoptimized={true}
                                             />
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">{`Color: ${item.variant.color}, Size: ${item.variant.size}`}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant={isLowStock ? "destructive" : availableStock > 0 ? "secondary" : "outline"}>
                                                    {availableStock > 0 ? `${availableStock} in stock` : 'Out of Stock'}
                                                </Badge>
                                                {isLowStock && availableStock > 0 && (
                                                    <Badge variant="destructive">Low stock!</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>ETB {item.price.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                min="1"
                                                max={availableStock + item.quantity}
                                                value={item.quantity} 
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value) || 0;
                                                    const maxAllowed = availableStock + item.quantity;
                                                    if (value <= maxAllowed) {
                                                        updateQuantity(item.variant.id, value);
                                                    }
                                                }}
                                                className="w-24"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">ETB {(item.price * item.quantity).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.variant.id)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Remove Item</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex flex-col items-end gap-4 bg-muted/50 p-6">
                    <div className="w-full sm:w-72 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>ETB {totalAmount.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount ({(shopDiscount * 100).toFixed(0)}%)</span>
                            <span className="text-destructive">- ETB {(totalAmount - finalAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
                            <span>Total Amount</span>
                            <span>ETB {finalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <Button size="lg" onClick={handlePlaceOrder}>Place Order</Button>
                </CardFooter>
            </Card>
        </div>
    );
}