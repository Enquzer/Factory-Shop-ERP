"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useOrder } from "@/hooks/use-order";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderQuantities = {
    [variantId: string]: number;
}

export function ProductDetailDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { addItem } = useOrder();
    const { toast } = useToast();
    const [quantities, setQuantities] = useState<OrderQuantities>({});

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Select the color, size, and quantity you wish to order. Unit Price: ETB {product.price.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto pr-4">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.variants.map((variant) => (
                    <Card key={variant.id} className="overflow-hidden">
                         <div className="relative w-full aspect-[4/5]">
                            <Image src={variant.imageUrl} alt={`${product.name} - ${variant.color} ${variant.size}`} fill style={{objectFit: 'cover'}} data-ai-hint={variant.imageHint} />
                        </div>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">{variant.color} - {variant.size}</h3>
                                <Badge variant={variant.stock > 0 ? "secondary" : "destructive"}>
                                    {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of Stock'}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-center gap-2">
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
                        </CardContent>
                    </Card>
                ))}
           </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAddAllToOrder} disabled={totalSelected === 0}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add ({totalSelected}) to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
