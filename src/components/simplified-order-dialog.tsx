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
  onOrderPlaced: (productCode: string, quantities: Map<string, number>) => void;
}

export function SimplifiedOrderDialog({ open, onOpenChange, product, shopId, onOrderPlaced }: SimplifiedOrderDialogProps) {
  const [quantity, setQuantity] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [previewDistribution, setPreviewDistribution] = useState<Map<string, number>>(new Map());
  const { addSimplifiedOrder } = useOrder();
  const { toast } = useToast();

  React.useEffect(() => {
    if (quantity > 0) {
      // Calculate distribution for preview
      // Note: We use the passed product variants directly. 
      // If we need fresher stock data, we might need to fetch here, but for preview prompt data is okay.
      // However, handlePlaceOrder fetches fresh data.
      
      const dist = distributeOrderQuantity(
        product.variants as any[], // Casting as any to avoid strict type mismatch if needed, or fixing import
        quantity,
        'proportional'
      );
      setPreviewDistribution(dist);
    }
  }, [quantity, product.variants]);

  const handleIncrement = () => {
    setQuantity(prev => prev + 12);
  };

  const handleDecrement = () => {
    setQuantity(prev => Math.max(12, prev - 12));
  };

  const handleQuantityChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      // Round to nearest multiple of 12
      const rounded = Math.round(numValue / 12) * 12;
      setQuantity(rounded || 12);
    }
  };

  const handlePlaceOrder = async () => {
    if (quantity <= 0 || quantity % 12 !== 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity (multiples of 12).",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get the full product details including all variants (fresh stock)
      const response = await fetch(`/api/products/${product.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      
      const fullProduct = await response.json();
      
      const distributionMode = 'proportional';

      // Distribute the quantity across variants using AI
      const distribution = distributeOrderQuantity(
        fullProduct.variants,
        quantity,
        distributionMode
      );

      // Add the order using the hook
      await addSimplifiedOrder(product.productCode, distribution);

      // Call the callback with the product code and distribution quantities
      onOrderPlaced(product.productCode, distribution);

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place Simplified Order</DialogTitle>
          <DialogDescription>
            Order {product.name} in bulk quantities (multiples of 12).
            The system distributes variants based on available factory stock.
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
                disabled={quantity <= 12}
              >
                <span className="text-lg">-</span>
              </Button>
              <Input
                id="quantity"
                type="number"
                min="12"
                step="12"
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
            <h4 className="font-medium mb-2">Automated Distribution Preview</h4>
            <p className="text-xs text-muted-foreground mb-3">
              This is how your order of {quantity} items will be distributed based on current stock availability.
            </p>
            
            <div className="max-h-40 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Color</th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(previewDistribution.entries()).map(([variantId, qty]) => {
                      const variant = product.variants.find(v => v.id === variantId);
                      if (!variant || qty === 0) return null;
                      return (
                        <tr key={variantId} className="border-t">
                          <td className="p-2">{variant.color}</td>
                          <td className="p-2">{variant.size}</td>
                          <td className="p-2 text-right font-medium">{qty}</td>
                        </tr>
                      );
                    })}
                    {previewDistribution.size === 0 && (
                        <tr>
                            <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                No stock available to distribute.
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel Order
          </Button>
          <Button 
            onClick={handlePlaceOrder} 
            disabled={isLoading || quantity <= 0 || quantity % 12 !== 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              "Confirm & Place Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}