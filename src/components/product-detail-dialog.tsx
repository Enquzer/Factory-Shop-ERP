

"use client";

import { useState, useMemo } from "react";
import type { Product, ProductVariant } from "@/lib/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useOrder } from "@/hooks/use-order";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type OrderQuantities = {
    [variantId: string]: number;
}

export function ProductDetailDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { addItem, shopDiscount } = useOrder();
    const { toast } = useToast();
    const [quantities, setQuantities] = useState<OrderQuantities>({});

    const variantsByColor = useMemo(() => {
        return product.variants.reduce((acc, variant) => {
            if (!acc[variant.color]) {
                acc[variant.color] = {
                    imageUrl: variant.imageUrl,
                    variants: [],
                };
            }
            acc[variant.color].variants.push(variant);
            return acc;
        }, {} as Record<string, { imageUrl: string; variants: ProductVariant[] }>);
    }, [product.variants]);

    const handleQuantityChange = (variantId: string, amount: number) => {
        setQuantities(prev => ({
            ...prev,
            [variantId]: Math.max(0, (prev[variantId] || 0) + amount)
        }));
    }

    const handleAddAllToOrder = () => {
        let itemsAdded = 0;
        Object.entries(quantities).forEach(([variantId, quantity]) => {
            if (quantity > 0) {
                const variant = product.variants.find(v => v.id === variantId);
                if (variant) {
                    addItem(product, variant, quantity);
                    itemsAdded += quantity;
                }
            }
        });

        if (itemsAdded > 0) {
            toast({
                title: "Products Added",
                description: `${itemsAdded} item(s) have been added to your order.`,
            });
            setQuantities({});
            onOpenChange(false);
        } else {
             toast({
                title: "No Items Selected",
                description: "Please specify a quantity for the items you wish to order.",
                variant: "destructive",
            });
        }
    };
    
    const totalSelected = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    const subTotal = Object.entries(quantities).reduce((total, [variantId, quantity]) => {
        return total + (product.price * quantity);
    }, 0);
    const discountAmount = subTotal * shopDiscount;
    const finalTotal = subTotal - discountAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Select the color, size, and quantity you wish to order. Unit Price: ETB {product.price.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[65vh] overflow-y-auto pr-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(variantsByColor).map(([color, { imageUrl, variants }]) => (
                    <Card key={color} className="overflow-hidden">
                         <div className="relative w-full aspect-[4/5]">
                            <Image src={imageUrl} alt={`${product.name} - ${color}`} fill style={{objectFit: 'cover'}} />
                        </div>
                        <CardContent className="p-4 space-y-3">
                            <h3 className="font-bold text-lg">{color}</h3>
                            <Separator />
                            <div className="space-y-4">
                                {variants.map(variant => (
                                    <div key={variant.id} className="grid grid-cols-3 items-center gap-2">
                                        <div className="space-y-1">
                                            <p className="font-medium">{variant.size}</p>
                                             <Badge variant={variant.stock > 0 ? "secondary" : "destructive"}>
                                                {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of Stock'}
                                            </Badge>
                                        </div>

                                        <div className="col-span-2 flex items-center justify-end gap-2">
                                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleQuantityChange(variant.id, -1)} disabled={(quantities[variant.id] || 0) === 0}>
                                                <MinusCircle className="h-4 w-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                className="w-16 h-8 text-center"
                                                value={quantities[variant.id] || 0}
                                                onChange={(e) => setQuantities(prev => ({...prev, [variant.id]: Math.max(0, parseInt(e.target.value) || 0)}))}
                                                min="0"
                                                max={variant.stock}
                                                disabled={variant.stock === 0}
                                            />
                                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleQuantityChange(variant.id, 1)} disabled={(quantities[variant.id] || 0) >= variant.stock}>
                                                <PlusCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
           </div>
        </div>
        <DialogFooter className="flex-col sm:items-end gap-4 border-t pt-4">
            <div className="w-full sm:w-64 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>ETB {subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Discount ({(shopDiscount * 100).toFixed(0)}%)</span>
                    <span className="text-destructive">- ETB {discountAmount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>ETB {finalTotal.toFixed(2)}</span>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button onClick={handleAddAllToOrder} disabled={totalSelected === 0} className="w-full sm:w-auto">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add ({totalSelected}) to Order
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
