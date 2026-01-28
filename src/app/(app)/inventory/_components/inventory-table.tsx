"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { BulkSelectionTable } from "@/components/bulk-selection-table";
import { BulkActions } from "@/components/bulk-actions";

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

  const getPriceForVariant = (product: Product, variant: any): number => {
    if (!product.agePricing || product.agePricing.length === 0) return product.price;

    const variantSize = variant.size?.trim().toLowerCase();
    
    // 1. Try label match (sizes column)
    const labelMatch = product.agePricing.find(p => 
        p.sizes?.split(',').map((s: string) => s.trim().toLowerCase()).includes(variantSize)
    );
    if (labelMatch) return labelMatch.price;

    // 2. Try numeric range match
    const sizeNum = parseInt(variantSize);
    if (!isNaN(sizeNum)) {
        const rangeMatch = product.agePricing.find(p => 
            p.ageMin !== undefined && p.ageMax !== undefined &&
            sizeNum >= (p.ageMin || 0) && sizeNum <= (p.ageMax || 0)
        );
        if (rangeMatch) return rangeMatch.price;
    }

    return product.price;
  };

  const displayItems = products.flatMap(product => {
    if (!product.agePricing || product.agePricing.length === 0) {
      return [{
        ...product,
        displayId: product.id,
        displayName: product.name,
        displayPrice: product.price,
        totalStock: product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      }];
    }
    
    // Group variants by their price
    const priceGroups: Record<number, { variants: any[], price: number }> = {};
    
    product.variants.forEach(variant => {
      const price = getPriceForVariant(product, variant);
      if (!priceGroups[price]) {
        priceGroups[price] = { variants: [], price };
      }
      priceGroups[price].variants.push(variant);
    });
    
    return Object.values(priceGroups).map(group => {
      const uniqueSizes = [...new Set(group.variants.map(v => v.size))].sort();
      const sizesLabel = uniqueSizes.length > 0 ? ` (Sizes: ${uniqueSizes.join(', ')})` : "";
      const totalStock = group.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
      
      return {
        ...product,
        displayId: `${product.id}-${group.price}`,
        displayName: `${product.name}${sizesLabel}`,
        displayPrice: group.price,
        totalStock: totalStock,
        variants: group.variants // Filtered variants for this price group
      };
    });
  });

  const handlePrint = (selectedIds: string[]) => {
    // For printing, we can open a new window with selected inventory details from display items
    const selectedItems = displayItems.filter(p => selectedIds.includes(p.displayId));
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let printContent = `
        <html>
          <head>
            <title>Selected Inventory</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Selected Inventory (${selectedItems.length})</h1>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Product Code</th>
                  <th>Category</th>
                  <th>Total Stock</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      selectedItems.forEach(item => {
        printContent += `
          <tr>
            <td>${item.displayName}</td>
            <td>${item.productCode}</td>
            <td>${item.category}</td>
            <td>${item.totalStock}</td>
            <td>${item.displayPrice.toLocaleString()}</td>
          </tr>
        `;
      });
      
      printContent += `
              </tbody>
            </table>
          </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };
  
  const handleDelete = async (selectedIds: string[]) => {
    // For deletion, we still need to delete the original products
    // We unique-ify the original product IDs from the selected split items
    const originalIdsToDelete = [...new Set(
        displayItems
            .filter(item => selectedIds.includes(item.displayId))
            .map(item => item.id)
    )];

    if (originalIdsToDelete.length === 0) return;

    // Call the API to delete selected products
    try {
      const response = await fetch('/api/bulk/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: originalIdsToDelete }),
      });
      
      if (response.ok) {
        // Call the onDelete function for each original product
        originalIdsToDelete.forEach(id => onDelete(id));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete products');
      }
    } catch (error) {
      console.error('Error deleting products:', error);
    }
  };
  
  const tableHeaders = [
    { key: 'product', title: 'Product', mobileTitle: 'Product' },
    { key: 'productCode', title: 'Product Code', mobileTitle: 'Code' },
    { key: 'category', title: 'Category', mobileTitle: 'Category' },
    { key: 'price', title: 'Price (ETB)', mobileTitle: 'Price' },
    { key: 'totalStock', title: 'Total Stock', mobileTitle: 'Stock' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' },
  ];
  

  return (
    <BulkSelectionTable
      headers={tableHeaders}
      data={displayItems.map(item => {
        return {
          ...item,
          id: item.displayId, // Use displayId for table selection
          product: (
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={item.imageUrl || "/placeholder-product.png"}
                  alt={item.displayName}
                  width={48}
                  height={48}
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-product.png";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.displayName}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {item.variants.length} variant{item.variants.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ),
          productCode: (
            <div className="text-sm">
              {item.productCode}
            </div>
          ),
          category: (
            <div className="text-sm">
              {item.category}
            </div>
          ),
          price: (
            <div className="text-sm">
              {item.displayPrice.toLocaleString()}
            </div>
          ),
          totalStock: (
            <div className="text-sm">
              <Badge variant={item.totalStock === 0 ? "destructive" : item.totalStock < 10 ? "secondary" : "default"}>
                {item.totalStock}
              </Badge>
            </div>
          ),
          actions: (
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(item as unknown as Product)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(item as unknown as Product)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(item.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        };
      })}
      idKey="id"
      actions={
        <BulkActions 
          onPrint={handlePrint}
          onDelete={handleDelete}
          printLabel="Print Selected"
          deleteLabel="Delete Selected"
          itemType="inventory"
        />
      }
    />
  );
}