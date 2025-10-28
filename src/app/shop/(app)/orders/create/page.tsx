"use client";

import { useOrder } from "@/hooks/use-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Trash2, Factory, Store, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";


export default function CreateOrderPage() {
    const { items, updateQuantity, removeItem, clearOrder, totalAmount, placeOrder, shopDiscount, getAvailableStock } = useOrder();
    const [factoryStock, setFactoryStock] = useState<Record<string, number>>({});
    const [shopStock, setShopStock] = useState<Record<string, number>>({});
    const [visualFactoryStock, setVisualFactoryStock] = useState<Record<string, number>>({});
    const [visualShopStock, setVisualShopStock] = useState<Record<string, number>>({});
    const [mode, setMode] = useState<"adjust" | "add">("adjust"); // Toggle between adjust and add modes
    const { toast } = useToast();
    
    // Fetch factory stock for each item
    const fetchFactoryStock = async () => {
        const stockMap: Record<string, number> = {};
        
        for (const item of items) {
            try {
                const response = await fetch(`/api/factory-stock?variantId=${item.variant.id}`);
                if (response.ok) {
                    const data = await response.json();
                    stockMap[item.variant.id] = data.factoryStock;
                } else if (response.status === 404) {
                    // Variant not found in factory stock, set to 0
                    stockMap[item.variant.id] = 0;
                }
                // For other errors, we'll just not update the stockMap, keeping it as undefined
            } catch (error) {
                console.error(`Error fetching factory stock for variant ${item.variant.id}:`, error);
            }
        }
        
        setFactoryStock(stockMap);
        setVisualFactoryStock(stockMap);
    };
    
    // Fetch shop stock for each item
    const fetchShopStock = () => {
        const stockMap: Record<string, number> = {};
        
        for (const item of items) {
            const availableStock = getAvailableStock(item.variant.id);
            stockMap[item.variant.id] = availableStock;
        }
        
        setShopStock(stockMap);
        setVisualShopStock(stockMap);
    };
    
    const handlePlaceOrder = () => {
        // Check if any items have 0 factory stock before placing order
        const outOfStockItems = items.filter(item => {
            const factoryStockForItem = visualFactoryStock[item.variant.id] !== undefined 
                ? visualFactoryStock[item.variant.id] 
                : 0;
            return factoryStockForItem <= 0;
        });
        
        if (outOfStockItems.length > 0) {
            toast({
                title: "Order Contains Out of Stock Items",
                description: "Some items in your order are out of stock at the factory. Please remove them or reduce quantities.",
                variant: "destructive",
            });
            return;
        }
        
        // Check if any items exceed factory stock
        const insufficientStockItems = items.filter(item => {
            const factoryStockForItem = visualFactoryStock[item.variant.id] !== undefined 
                ? visualFactoryStock[item.variant.id] 
                : 0;
            return item.quantity > factoryStockForItem;
        });
        
        if (insufficientStockItems.length > 0) {
            toast({
                title: "Insufficient Factory Stock",
                description: "Some items in your order exceed available factory stock. Please reduce quantities.",
                variant: "destructive",
            });
            return;
        }
        
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
    
    // Update visual stock when quantity changes
    const handleQuantityChange = (variantId: string, newQuantity: number) => {
        // Get current item quantity
        const currentItem = items.find((item) => item.variant.id === variantId);
        const currentOrderQuantity = currentItem ? currentItem.quantity : 0;
        const quantityChange = newQuantity - currentOrderQuantity;
        
        // Update visual factory stock
        setVisualFactoryStock(prev => ({
            ...prev,
            [variantId]: (prev[variantId] || factoryStock[variantId] || 0) - quantityChange
        }));
        
        // Update visual shop stock
        setVisualShopStock(prev => ({
            ...prev,
            [variantId]: (prev[variantId] || shopStock[variantId] || 0) + quantityChange
        }));
        
        // Update the actual order quantity
        updateQuantity(variantId, newQuantity);
    };
    
    // Increase quantity by 1
    const increaseQuantity = (variantId: string) => {
        const currentItem = items.find((item) => item.variant.id === variantId);
        if (currentItem) {
            handleQuantityChange(variantId, currentItem.quantity + 1);
        }
    };
    
    // Decrease quantity by 1
    const decreaseQuantity = (variantId: string) => {
        const currentItem = items.find((item) => item.variant.id === variantId);
        if (currentItem && currentItem.quantity > 1) {
            handleQuantityChange(variantId, currentItem.quantity - 1);
        } else if (currentItem && currentItem.quantity === 1) {
            removeItem(variantId);
        }
    };
    
    // Fetch factory stock for each item
    useEffect(() => {
        if (items.length > 0) {
            fetchFactoryStock();
        }
    }, [items]);

    // Fetch shop stock for each item
    useEffect(() => {
        if (items.length > 0) {
            fetchShopStock();
        }
    }, [items, getAvailableStock]);

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
                <div className="flex items-center gap-2">
                    <div className="flex rounded-md shadow-sm" role="group">
                        <Button
                            variant={mode === "adjust" ? "default" : "outline"}
                            onClick={() => setMode("adjust")}
                            className="rounded-r-none border-r-0"
                        >
                            Adjust Quantities
                        </Button>
                        <Button
                            variant={mode === "add" ? "default" : "outline"}
                            onClick={() => setMode("add")}
                            className="rounded-l-none"
                        >
                            Add Products
                        </Button>
                    </div>
                    <Button variant="outline" onClick={clearOrder}>Clear Order</Button>
                </div>
            </div>
            
            {mode === "add" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add Products</CardTitle>
                        <CardDescription>Click on a product to add it to your order</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/shop/products">Browse Products to Add</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
            
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
                                <TableHead>Stock Levels</TableHead>
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
                                const isOutOfStock = availableStock <= 0;
                                const factoryStockForItem = visualFactoryStock[item.variant.id] !== undefined 
                                    ? visualFactoryStock[item.variant.id] 
                                    : 'Not available';
                                const shopStockForItem = visualShopStock[item.variant.id] !== undefined
                                    ? visualShopStock[item.variant.id]
                                    : 'Not available';
                                
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
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Store className="h-3 w-3 text-green-500" />
                                                    <Badge variant="outline" className="text-xs">
                                                        Your Stock: {shopStockForItem}
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
                                        <TableCell>ETB {item.price.toFixed(2)}</TableCell>
                                        <TableCell>
                                            {mode === "adjust" ? (
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        onClick={() => decreaseQuantity(item.variant.id)}
                                                        disabled={isOutOfStock}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <Input 
                                                        type="number" 
                                                        min="1"
                                                        max={factoryStockForItem !== 'Not available' ? factoryStockForItem : item.quantity}
                                                        value={item.quantity} 
                                                        onChange={(e) => {
                                                            const value = parseInt(e.target.value) || 0;
                                                            const maxAllowed = factoryStockForItem !== 'Not available' ? factoryStockForItem : item.quantity;
                                                            if (value <= maxAllowed) {
                                                                handleQuantityChange(item.variant.id, value);
                                                            }
                                                        }}
                                                        className="w-20 text-center"
                                                        disabled={isOutOfStock}
                                                    />
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        onClick={() => increaseQuantity(item.variant.id)}
                                                        disabled={isOutOfStock}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="text-center font-medium">
                                                    {item.quantity}
                                                </div>
                                            )}
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