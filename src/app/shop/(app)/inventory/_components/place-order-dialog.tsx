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
import { createAuthHeaders } from "@/lib/auth-helpers";

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
  const [factoryStock, setFactoryStock] = useState<number | null>(null);
  const [loadingFactoryStock, setLoadingFactoryStock] = useState(false);
  const { toast } = useToast();
  const { addItem } = useOrder();
  const router = useRouter();

  // Reset form when dialog opens and fetch factory stock
  useEffect(() => {
    if (open && item) {
      setQuantity(1);
      setFactoryStock(null);
      fetchFactoryStock();
    }
  }, [open, item]);
  
  const fetchFactoryStock = async () => {
    if (!item) return;
    
    setLoadingFactoryStock(true);
    try {
      const response = await fetch(`/api/factory-stock?variantId=${item.productVariantId}`, {
        headers: createAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setFactoryStock(data.factoryStock);
      } else {
        console.error('Failed to fetch factory stock:', response.status);
        setFactoryStock(0);
      }
    } catch (error) {
      console.error('Error fetching factory stock:', error);
      setFactoryStock(0);
    } finally {
      setLoadingFactoryStock(false);
    }
  };

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
    
    if (factoryStock !== null && quantity > factoryStock) {
      toast({
        title: "Insufficient Factory Stock",
        description: `Cannot order ${quantity} units. Only ${factoryStock} units available in factory stock.`,
        variant: "destructive",
      });
      return;
    }

    // Check factory stock instead of shop inventory
    // This will be validated properly in the useOrder hook

    // Create a product object that matches the expected structure
    const product = {
      id: item.productId,
      productCode: item.productCode || item.productId, // Use actual productCode if available
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
              Your Stock
            </Label>
            <div className="col-span-3 font-medium">
              {item.stock} units
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="factory-stock" className="text-right">
              Factory Stock
            </Label>
            <div className="col-span-3 font-medium">
              {loadingFactoryStock ? 'Loading...' : factoryStock !== null ? `${factoryStock} units` : 'N/A'}
            </div>
          </div>
          <div className="text-sm text-muted-foreground col-span-4 text-center">
            Order will be fulfilled from factory stock
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
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