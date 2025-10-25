"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Product } from "@/lib/products";

interface ProductViewDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ProductViewDialog({ product, open, onClose }: ProductViewDialogProps) {
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);

  if (!product) return null;

  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  const totalValue = totalStock * product.price;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>Product details and variants</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={product.imageUrl || "/placeholder-product.png"}
                alt={product.name}
                fill
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-product.png";
                }}
              />
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Code:</span>
                <span className="font-mono">{product.productCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span>{product.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span>ETB {product.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Stock:</span>
                <Badge variant={totalStock === 0 ? "destructive" : totalStock < 10 ? "secondary" : "default"}>
                  {totalStock}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value:</span>
                <span>ETB {totalValue.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Product Variants</h3>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.variants.map((variant, index) => (
                  <TableRow 
                    key={variant.id} 
                    className={selectedVariant === index ? "bg-muted" : ""}
                    onClick={() => setSelectedVariant(index === selectedVariant ? null : index)}
                  >
                    <TableCell>
                      <div className="relative h-10 w-10 rounded-md overflow-hidden">
                        <Image
                          src={variant.imageUrl || product.imageUrl || "/placeholder-product.png"}
                          alt={`${product.name} - ${variant.color}, ${variant.size}`}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder-product.png";
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{variant.color}</TableCell>
                    <TableCell>{variant.size}</TableCell>
                    <TableCell>
                      <Badge variant={variant.stock === 0 ? "destructive" : variant.stock < 5 ? "secondary" : "default"}>
                        {variant.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>ETB {(variant.stock * product.price).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {product.description && (
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-2">Description</h4>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}