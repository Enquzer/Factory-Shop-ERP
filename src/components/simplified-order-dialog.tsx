"use client";

import * as React from "react";
import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useOrder } from "@/hooks/use-order";
import { distributeOrderQuantity } from "@/lib/ai-distribution";

interface SimplifiedOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    productCode: string;
    name: string;
    price: number;
    variants: Array<{
      id: string;
      color: string;
      size: string;
      stock: number;
    }>;
  };
  shopId: string;
}

export function SimplifiedOrderDialog({ open, onOpenChange, product, shopId }: SimplifiedOrderDialogProps) {
  const [quantity, setQuantity] = useState(6);
  const [isLoading, setIsLoading] = useState(false);
  const { addSimplifiedOrder } = useOrder();
  const { toast } = useToast();

  const handleIncrement = () => {
    setQuantity(prev => prev + 6);
  };

  const handleDecrement = () => {
    setQuantity(prev => Math.max(6, prev - 6));
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      // Round to nearest multiple of 6
      const rounded = Math.round(numValue / 6) * 6;
      setQuantity(rounded || 6);
    }
  };

  const handlePlaceOrder = async () => {
    if (quantity <= 0 || quantity % 6 !== 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity (multiples of 6).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get the full product details including all variants
      const response = await fetch(`/api/products/${product.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      
      const fullProduct = await response.json();
      
      // Use proportional distribution as default since we removed the AI distribution mode
      const distributionMode = 'proportional';

      // Distribute the quantity across variants using AI
      const distribution = distributeOrderQuantity(
        fullProduct.variants,
        quantity,
        distributionMode
      );

      // Add the order using the hook
      await addSimplifiedOrder(product.productCode, distribution);

      // Close the dialog
      onOpenChange(false);

      toast({
        title: "Order Placed Successfully",
        description: `Ordered ${quantity} units of ${product.name}. AI has distributed the variants accordingly.`,
      });
    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: "Order Failed",
        description: "There was an issue placing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Place Simplified Order</DialogTitle>
          <DialogDescription>
            Order {product.name} in bulk quantities (multiples of 6).
            The system will automatically distribute variants using AI.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={handleDecrement}
                disabled={quantity <= 6}
              >
                <span className="text-lg">-</span>
              </Button>
              <Input
                id="quantity"
                type="number"
                min="6"
                step="6"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="text-center"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                onClick={handleIncrement}
              >
                <span className="text-lg">+</span>
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border bg-muted p-4">
            <h4 className="font-medium mb-2">Order Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium">{product.name}</span>
              
              <span className="text-muted-foreground">Code:</span>
              <span>{product.productCode}</span>
              
              <span className="text-muted-foreground">Unit Price:</span>
              <span>ETB {product.price.toLocaleString()}</span>
              
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">ETB {(product.price * quantity).toLocaleString()}</span>
            </div>
          </div>
          
          <div className="rounded-lg border p-4">
            <h4 className="font-medium mb-2">AI Distribution</h4>
            <p className="text-sm text-muted-foreground">
              The system will automatically distribute your order across available variants 
              based on proportional distribution.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePlaceOrder} 
            disabled={isLoading || quantity <= 0 || quantity % 6 !== 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}