"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useOrder } from "@/hooks/use-order";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, ShoppingCart } from "lucide-react";

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Select the color, size, and quantity you wish to order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
            <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden">
                <Image src={product.imageUrl} alt={product.name} fill style={{objectFit: 'cover'}} data-ai-hint={product.imageHint} />
            </div>
            <div>
                <h3 className="font-semibold mb-2">Available Variants</h3>
                 <p className="text-lg font-semibold mb-4">ETB {product.price.toFixed(2)} / unit</p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Color</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>In Stock</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {product.variants.map((variant) => (
                            <TableRow key={variant.id}>
                                <TableCell>{variant.color}</TableCell>
                                <TableCell>{variant.size}</TableCell>
                                <TableCell>{variant.stock}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-2">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuantityChange(variant.id, -1)} disabled={(quantities[variant.id] || 0) === 0}>
                                            <MinusCircle className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            type="number"
                                            className="w-14 h-8 text-center"
                                            value={quantities[variant.id] || 0}
                                            onChange={(e) => setQuantities(prev => ({...prev, [variant.id]: Math.max(0, parseInt(e.target.value) || 0)}))}
                                            min="0"
                                            max={variant.stock}
                                        />
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleQuantityChange(variant.id, 1)} disabled={(quantities[variant.id] || 0) >= variant.stock}>
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
