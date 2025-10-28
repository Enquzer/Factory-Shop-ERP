"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { type ShopInventoryItem } from '@/lib/shop-inventory';
import { useState, useEffect } from "react";
import { useOrder } from "@/hooks/use-order";
import { useRouter } from "next/navigation";

export function PlaceOrderDialog({ 
  item, 
  open, 
  onOpenChange
}: { 
  item: ShopInventoryItem | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const { addItem } = useOrder();
  const router = useRouter();

  // Reset form when dialog opens
  useEffect(() => {
    if (open && item) {
      setQuantity(1);
    }
  }, [open, item]);

  const handlePlaceOrder = async () => {
    if (!item) return;
    
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Order quantity must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (quantity > item.stock) {
      toast({
        title: "Insufficient Stock",
        description: `You only have ${item.stock} units available.`,
        variant: "destructive",
      });
      return;
    }

    // Create a product object that matches the expected structure
    const product = {
      id: item.productId,
      productCode: `PROD-${item.productId}`,
      name: item.name,
      category: "General",
      price: item.price,
      minimumStockLevel: 0,
      variants: [{
        id: item.productVariantId,
        productId: item.productId,
        color: item.color,
        size: item.size,
        stock: item.stock,
        imageUrl: item.imageUrl
      }],
      imageUrl: item.imageUrl
    };

    // Create a variant object
    const variant = {
      id: item.productVariantId,
      productId: item.productId,
      color: item.color,
      size: item.size,
      stock: item.stock,
      imageUrl: item.imageUrl
    };

    // Add item to cart
    await addItem(product, variant, quantity);
    
    // Redirect to the order creation page
    router.push('/shop/orders/create');
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Place Order</DialogTitle>
          <DialogDescription>
            Place an order for {item.name} ({item.color}, {item.size})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="available-stock" className="text-right">
              Available Stock
            </Label>
            <div className="col-span-3 font-medium">
              {item.stock} units
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={item.stock}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(item.stock, Math.max(1, Number(e.target.value))))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handlePlaceOrder}>
            Place Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}