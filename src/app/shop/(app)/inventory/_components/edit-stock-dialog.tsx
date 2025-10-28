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
import { useState } from "react";

export function EditStockDialog({ 
  item, 
  open, 
  onOpenChange,
  onStockUpdate
}: { 
  item: ShopInventoryItem | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onStockUpdate: (item: ShopInventoryItem, newStock: number) => void;
}) {
  const [newStock, setNewStock] = useState(0);
  const { toast } = useToast();

  // Reset form when dialog opens
  if (open && item && newStock === 0) {
    setNewStock(item.stock);
  }

  const handleSubmit = () => {
    if (!item) return;
    
    if (newStock < 0) {
      toast({
        title: "Invalid Stock",
        description: "Stock quantity cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    onStockUpdate(item, newStock);
    onOpenChange(false);
    setNewStock(0);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Stock</DialogTitle>
          <DialogDescription>
            Update the stock quantity for {item.name} ({item.color}, {item.size})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stock" className="text-right">
              Current Stock
            </Label>
            <div className="col-span-3 font-medium">
              {item.stock} units
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-stock" className="text-right">
              New Stock
            </Label>
            <Input
              id="new-stock"
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}