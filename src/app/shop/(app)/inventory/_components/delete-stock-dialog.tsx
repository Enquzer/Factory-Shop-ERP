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
import { type ShopInventoryItem } from '@/lib/shop-inventory';

export function DeleteStockDialog({ 
  item, 
  open, 
  onOpenChange,
  onConfirm
}: { 
  item: ShopInventoryItem | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: ShopInventoryItem) => void;
}) {
  const handleConfirm = () => {
    if (item) {
      onConfirm(item);
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Stock Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {item.name} ({item.color}, {item.size}) from your inventory? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-medium">Product:</span>
            <span className="col-span-3">{item.name}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-medium">Variant:</span>
            <span className="col-span-3">{item.color}, {item.size}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-medium">Current Stock:</span>
            <span className="col-span-3">{item.stock} units</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}