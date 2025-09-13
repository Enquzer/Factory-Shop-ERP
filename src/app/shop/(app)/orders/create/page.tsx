"use client";

import { useOrder } from "@/hooks/use-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function CreateOrderPage() {
    const { items, updateQuantity, removeItem, clearOrder, totalAmount } = useOrder();
    const { toast } = useToast();

    const handlePlaceOrder = () => {
        // In a real app, this would submit the order to the backend
        toast({
            title: "Order Placed!",
            description: "Your order has been sent to the factory for processing."
        });
        clearOrder();
    }

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
                            {items.map(item => (
                                <TableRow key={item.variant.id}>
                                    <TableCell className="hidden md:table-cell">
                                        <Image src={item.imageUrl} alt={item.name} width={64} height={80} className="rounded-md object-cover" />
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">{`Color: ${item.variant.color}, Size: ${item.variant.size}`}</p>
                                    </TableCell>
                                    <TableCell>ETB {item.price.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            min="1"
                                            value={item.quantity} 
                                            onChange={(e) => updateQuantity(item.variant.id, parseInt(e.target.value))}
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex flex-col items-end gap-4 bg-muted/50 p-6">
                    <div className="text-lg font-semibold">
                        Total Amount: ETB {totalAmount.toFixed(2)}
                    </div>
                     <p className="text-sm text-muted-foreground">
                        Your shop discount will be applied by the factory upon confirmation.
                    </p>
                    <Button size="lg" onClick={handlePlaceOrder}>Place Order</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
