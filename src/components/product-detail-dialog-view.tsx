"use client";

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
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";

export function ProductDetailDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {product.productCode} - {product.category}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-6">
                <div className="relative aspect-[4/5] rounded-lg overflow-hidden">
                     <Image 
                        src={product.imageUrl || '/placeholder-product.png'} 
                        alt={product.name} 
                        fill 
                        style={{objectFit: 'cover'}} 
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-product.png';
                        }}
                        unoptimized={true}
                      />
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold text-lg">Price</h3>
                        <p className="text-2xl font-bold text-primary">ETB {product.price.toFixed(2)}</p>
                    </div>
                    
                    <Separator />

                    <div>
                        <h3 className="font-semibold text-lg">Description</h3>
                        <p className="text-sm text-muted-foreground">
                            {product.description || "No description available."}
                        </p>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold text-lg">Total Stock</h3>
                        <p className="text-xl font-bold">
                            {product.variants.reduce((acc, v) => acc + v.stock, 0)} units
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Variant Images Gallery */}
            {product.variants.some(v => v.imageUrl) && (
              <div className="mt-6 pr-6">
                <h3 className="font-semibold text-lg mb-2">Variant Images</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {product.variants.map(variant => (
                    variant.imageUrl && (
                      <div key={variant.id} className="relative aspect-square rounded-md overflow-hidden border">
                        <Image 
                          src={variant.imageUrl} 
                          alt={`${product.name} - ${variant.color}, ${variant.size}`} 
                          fill 
                          style={{objectFit: 'cover'}} 
                          onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-product.png';
                          }}
                          unoptimized={true}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                          {variant.color}, {variant.size}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 pr-6">
                <h3 className="font-semibold text-lg mb-2">Inventory Details</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Color</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {product.variants.map(variant => (
                            <TableRow key={variant.id}>
                                <TableCell>{variant.color}</TableCell>
                                <TableCell>{variant.size}</TableCell>
                                <TableCell className="text-right">
                                     <Badge variant={variant.stock > 0 ? 'outline' : 'destructive'}>
                                        {variant.stock}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}