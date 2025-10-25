"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import Image from "next/image";
import { Product } from "@/lib/products";

interface InventoryTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView: (product: Product) => void;
}

export function InventoryTable({ products, onEdit, onDelete, onView }: InventoryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRowExpansion = (productId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Product Code</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price (ETB)</TableHead>
            <TableHead>Total Stock</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
            const isExpanded = expandedRows[product.id] || false;
            
            return (
              <>
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-md overflow-hidden">
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
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{product.productCode}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={totalStock === 0 ? "destructive" : totalStock < 10 ? "secondary" : "default"}>
                      {totalStock}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(product)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(product.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                
                {isExpanded && product.variants.map((variant) => (
                  <TableRow key={variant.id} className="bg-muted/50">
                    <TableCell colSpan={6} className="p-0">
                      <div className="p-4 pl-16 grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="flex items-center gap-3">
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
                          <div>
                            <div className="font-medium">Variant</div>
                            <div className="text-sm text-muted-foreground">
                              {variant.color}, {variant.size}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Color</div>
                          <div>{variant.color}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Size</div>
                          <div>{variant.size}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Stock</div>
                          <Badge variant={variant.stock === 0 ? "destructive" : variant.stock < 5 ? "secondary" : "default"}>
                            {variant.stock}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Value</div>
                          <div>ETB {(variant.stock * product.price).toLocaleString()}</div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}