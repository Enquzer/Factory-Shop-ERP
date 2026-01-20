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

  const handlePrint = (selectedIds: string[]) => {
    // For printing, we can open a new window with selected inventory details
    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
    
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
            <h1>Selected Inventory (${selectedProducts.length})</h1>
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
      
      selectedProducts.forEach(product => {
        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        printContent += `
          <tr>
            <td>${product.name}</td>
            <td>${product.productCode}</td>
            <td>${product.category}</td>
            <td>${totalStock}</td>
            <td>${product.price}</td>
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
    // Call the API to delete selected products
    try {
      const response = await fetch('/api/bulk/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      
      if (response.ok) {
        // Call the onDelete function for each selected product
        selectedIds.forEach(id => onDelete(id));
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
      data={products.map(product => {
        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        
        return {
          ...product,
          product: (
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={product.imageUrl || "/placeholder-product.png"}
                  alt={product.name}
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
                <div className="font-medium truncate">{product.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ),
          productCode: (
            <div className="text-sm">
              {product.productCode}
            </div>
          ),
          category: (
            <div className="text-sm">
              {product.category}
            </div>
          ),
          price: (
            <div className="text-sm">
              {product.price.toLocaleString()}
            </div>
          ),
          totalStock: (
            <div className="text-sm">
              <Badge variant={totalStock === 0 ? "destructive" : totalStock < 10 ? "secondary" : "default"}>
                {totalStock}
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