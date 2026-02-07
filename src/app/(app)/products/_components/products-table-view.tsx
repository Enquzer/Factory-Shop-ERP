"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Edit, Eye, Trash2, History } from "lucide-react";
import { Product } from "@/lib/products";
import { StockDistributionChart } from "@/components/stock-distribution-chart";
import { useToast } from "@/hooks/use-toast";
import { generateColorScheme } from "@/lib/stock-distribution";
import { BulkSelectionTable } from "@/components/bulk-selection-table";
import { BulkActions } from "@/components/bulk-actions";
import { useBulkSelection } from "@/contexts/bulk-selection-context";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { EditProductDialog } from "@/components/edit-product-dialog";
import { ProductHistoryDialog } from "@/components/product-history-dialog";

interface ProductsTableViewProps {
  products: Product[];
  query: string;
  selectedCategory?: string | null;
  selectedStatus?: string | null;
  stockFilter?: string | null;
  dateRange?: { from?: Date; to?: Date };
  onProductsDeleted?: () => void;
}

export function ProductsTableView({ 
  products, 
  query,
  selectedCategory,
  selectedStatus,
  stockFilter,
  dateRange,
  onProductsDeleted
}: ProductsTableViewProps) {
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showingHistory, setShowingHistory] = useState<Product | null>(null);

  // Calculate total stock for a product
  const calculateTotalStock = (product: Product) => {
    return product.variants.reduce((total, variant) => total + variant.stock, 0);
  };

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Apply search filter
    const lowercasedTerm = query.toLowerCase();
    if (lowercasedTerm) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(lowercasedTerm) ||
        product.category.toLowerCase().includes(lowercasedTerm) ||
        product.productCode.toLowerCase().includes(lowercasedTerm)
      );
    }
    
    // Apply category filter
    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Apply status filter
    if (selectedStatus && selectedStatus !== "all") {
      if (selectedStatus === "available") {
        result = result.filter(product => product.readyToDeliver === 1);
      } else if (selectedStatus === "unavailable") {
        result = result.filter(product => product.readyToDeliver === 0);
      }
    }
    
    // Apply stock filter
    if (stockFilter && stockFilter !== "all") {
      result = result.filter(product => {
        const totalStock = calculateTotalStock(product);
        const minStockLevel = product.minimumStockLevel || 10;
        
        switch (stockFilter) {
          case "in-stock":
            return totalStock > minStockLevel;
          case "low-stock":
            return totalStock > 0 && totalStock <= minStockLevel;
          case "out-of-stock":
            return totalStock <= 0;
          default:
            return true;
        }
      });
    }
    
    // Apply date range filter
    if (dateRange?.from || dateRange?.to) {
      result = result.filter(product => {
        if (!product.created_at) return true;
        
        const productDate = new Date(product.created_at);
        
        if (dateRange.from && productDate < dateRange.from) {
          return false;
        }
        
        if (dateRange.to && productDate > dateRange.to) {
          return false;
        }
        
        return true;
      });
    }
    
    return result;
  }, [products, query, selectedCategory, selectedStatus, stockFilter, dateRange]);

  // Toggle expanded row for stock distribution chart
  const toggleRowExpansion = (productId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Export to CSV
  const exportToCSV = async () => {
    setExporting(true);
    try {
      // Generate detailed CSV content
      const csvContent = generateDetailedCSV(filteredProducts);
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'products-report.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL after a delay to allow the download to start
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          // URL might already be revoked or invalid, ignore the error
        }
      }, 1000);
      
      toast({
        title: "Export Successful",
        description: "Products data exported to CSV successfully.",
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export products data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Export to Excel (placeholder)
  const exportToExcel = async () => {
    toast({
      title: "Export Started",
      description: "Exporting to Excel format...",
    });
    
    // In a real implementation, we would use a library like xlsx:
    // import * as XLSX from 'xlsx';
    // 
    // const worksheet = XLSX.utils.json_to_sheet(filteredProducts.map(product => ({
    //   "Product Code": product.productCode,
    //   "Product Name": product.name,
    //   "Category": product.category,
    //   "Registered Date": product.created_at ? new Date(product.created_at).toLocaleDateString() : "N/A",
    //   "Total Quantity": calculateTotalStock(product),
    //   "Status": product.readyToDeliver === 1 ? "Available" : "Unavailable"
    // })));
    // 
    // const workbook = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    // XLSX.writeFile(workbook, "products-report.xlsx");
    
    setTimeout(() => {
      toast({
        title: "Export Completed",
        description: "Products data exported to Excel successfully.",
      });
    }, 1500);
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = '/api/products/export';
      link.download = 'products-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Started",
        description: "Exporting to PDF...",
      });
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export to PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No products found</p>
        <p className="text-sm">Try adjusting your filters or search term.</p>
      </div>
    );
  }

  const handlePrint = (selectedIds: string[]) => {
    // For printing, we can open a new window with selected product details
    const selectedProducts = filteredProducts.filter(p => selectedIds.includes(p.id));
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let printContent = `
        <html>
          <head>
            <title>Selected Products</title>
            <style>
              body { font-family: Arial, sans-serif; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Selected Products (${selectedProducts.length})</h1>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Product Code</th>
                  <th>Category</th>
                  <th>Total Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      selectedProducts.forEach(product => {
        const totalStock = calculateTotalStock(product);
        const status = product.readyToDeliver === 1 ? 'Available' : 'Unavailable';
        printContent += `
          <tr>
            <td>${product.name}</td>
            <td>${product.productCode}</td>
            <td>${product.category}</td>
            <td>${totalStock}</td>
            <td>${status}</td>
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
  
  const handleBulkOrder = async (selectedIds: string[]) => {
    try {
      // In a real implementation, this would handle bulk ordering of products
      // For now, we'll show a toast indicating the action
      
      toast({
        title: "Bulk Order Requested",
        description: `Ordering ${selectedIds.length} product(s). This would typically open an order form or process the order.`,
      });
      
      // Here you would typically:
      // 1. Open a modal to specify quantities for each product
      // 2. Process the order through an API
      // 3. Add to shopping cart
      // 4. Or any other order-related action
      
    } catch (error) {
      console.error('Error processing bulk order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process bulk order",
        variant: "destructive",
      });
    }
  };
  
  const handleDelete = async (selectedIds: string[]) => {
    try {
      // If it's a bulk delete (multiple IDs), use the bulk endpoint
      if (selectedIds.length > 1) {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/bulk/products', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ productIds: selectedIds }),
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: `${selectedIds.length} product(s) deleted successfully.`,
          });
          if (onProductsDeleted) onProductsDeleted();
        } else {
          let errorMsg = 'Failed to delete products';
          try {
             const errorText = await response.text();
             if (errorText) {
               try {
                 const errorData = JSON.parse(errorText);
                 errorMsg = errorData.message || errorData.error || errorMsg;
               } catch (e) {
                 // Not JSON, use text directly if it looks like a message (not huge HTML)
                 if (errorText.length < 200) errorMsg = errorText;
                 else errorMsg = `Server error (${response.status})`;
               }
             }
          } catch (e) {
             console.error('Error reading error response:', e);
          }
          throw new Error(errorMsg);
        }
      } else {
        // If it's a single product delete, use the single product endpoint
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/products?id=${selectedIds[0]}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Product deleted successfully.",
          });
          if (onProductsDeleted) onProductsDeleted();
        } else {
          let errorMsg = 'Failed to delete product';
          try {
             const errorText = await response.text();
             if (errorText) {
               try {
                 const errorData = JSON.parse(errorText);
                 errorMsg = errorData.message || errorData.error || errorMsg;
               } catch (e) {
                 // Not JSON, use text directly if it looks like a message
                 if (errorText.length < 200) errorMsg = errorText;
                 else errorMsg = `Server error (${response.status})`;
               }
             }
          } catch (e) {
             console.error('Error reading error response:', e);
          }
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error('Error deleting products:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete products",
        variant: "destructive",
      });
    }
  };
  
  const handleSingleProductDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast({
          title: "Product Deleted",
          description: `"${product.name}" has been deleted successfully.`,
        });
        if (onProductsDeleted) onProductsDeleted();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    }
  };
  
  const tableHeaders = [
    { key: 'product', title: 'Product', mobileTitle: 'Product' },
    { key: 'productCode', title: 'Product Code', mobileTitle: 'Code' },
    { key: 'registeredDate', title: 'Registered Date', mobileTitle: 'Date' },
    { key: 'totalQuantity', title: 'Total Quantity', mobileTitle: 'Qty' },
    { key: 'stockDistribution', title: 'Stock Distribution', mobileTitle: 'Distribution' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' },
  ];
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToExcel}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-1" />
            Export Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToPDF}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>
      
      <BulkSelectionTable
        headers={tableHeaders}
        data={filteredProducts.map(product => {
          const totalStock = calculateTotalStock(product);
          const isExpanded = expandedRows.has(product.id);
          const registeredDate = product.created_at 
            ? new Date(product.created_at).toLocaleDateString() 
            : "N/A";
          
          return {
            ...product,
            product: (
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                  <Image 
                    src={product.imageUrl || '/placeholder-product.png'} 
                    alt={product.name} 
                    width={48}
                    height={48}
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== window.location.origin + '/placeholder-product.png') {
                        target.src = '/placeholder-product.png';
                      }
                    }}
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{product.category}</div>
                </div>
              </div>
            ),
            productCode: (
              <div className="text-sm">
                <span className="font-medium">{product.productCode}</span>
              </div>
            ),
            registeredDate: (
              <div className="text-sm text-muted-foreground">
                {registeredDate}
              </div>
            ),
            totalQuantity: (
              <div className="text-sm">
                <Badge variant={totalStock > 0 ? "secondary" : "destructive"}>
                  {totalStock} in stock
                </Badge>
              </div>
            ),
            stockDistribution: (
              <div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    toggleRowExpansion(product.id);
                  }}
                  className="p-1 h-auto"
                >
                  <BarChart3 className="h-4 w-4" />
                  {isExpanded ? "Hide" : "Show"}
                </Button>
                {isExpanded && (
                  <div className="p-4 bg-gray-50 rounded-lg mt-2">
                    <StockDistributionChart 
                      product={product}
                      viewType="factory"
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ),
            actions: (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    setSelectedProduct(product);
                  }}
                >
                  <span className="sr-only">View</span>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    setEditingProduct(product);
                  }}
                >
                  <span className="sr-only">Edit</span>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    setShowingHistory(product);
                  }}
                >
                  <span className="sr-only">History</span>
                  <History className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click
                    handleSingleProductDelete(product);
                  }}
                >
                  <span className="sr-only">Delete</span>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          };
        })}
        idKey="id"
        actions={
          <BulkActions 
            onPrint={handlePrint}
            onDelete={handleDelete}
            onOrder={handleBulkOrder}
            printLabel="Print Selected"
            deleteLabel="Delete Selected"
            orderLabel="Order Selected"
            itemType="products"
          />
        }
      />
      
      {selectedProduct && (
        <ProductDetailDialog 
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedProduct(null);
            }
          }}
        />
      )}

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingProduct(null);
            }
          }}
          onProductUpdated={() => {
            // Refresh the product list after editing
            window.location.reload();
          }}
        />
      )}

      {showingHistory && (
        <ProductHistoryDialog
          product={showingHistory}
          open={!!showingHistory}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setShowingHistory(null);
            }
          }}
        />
      )}
    </div>
  );
}

// Helper function to generate color for a name
function getColorForName(name: string): string {
  // Use the existing color generation utility
  const colorScheme = generateColorScheme([name]);
  return colorScheme[0];
}

// Add this function to generate a more comprehensive CSV with distribution data
function generateDetailedCSV(products: Product[]): string {
  let csvContent = "Product Code,Product Name,Category,Registered Date,Total Quantity,Status,Size Distribution,Color Distribution\n";
  
  products.forEach(product => {
    const totalStock = product.variants.reduce((total, variant) => total + variant.stock, 0);
    const status = product.readyToDeliver === 1 ? "Available" : "Unavailable";
    const registeredDate = product.created_at ? new Date(product.created_at).toLocaleDateString() : "N/A";
    
    // Generate size distribution
    const sizeDistribution: Record<string, number> = {};
    product.variants.forEach(variant => {
      sizeDistribution[variant.size] = (sizeDistribution[variant.size] || 0) + variant.stock;
    });
    const sizeDistString = Object.entries(sizeDistribution)
      .map(([size, qty]) => `${size}:${qty}`)
      .join(';');
    
    // Generate color distribution
    const colorDistribution: Record<string, number> = {};
    product.variants.forEach(variant => {
      colorDistribution[variant.color] = (colorDistribution[variant.color] || 0) + variant.stock;
    });
    const colorDistString = Object.entries(colorDistribution)
      .map(([color, qty]) => `${color}:${qty}`)
      .join(';');
    
    csvContent += `"${product.productCode}","${product.name}","${product.category}","${registeredDate}",${totalStock},"${status}","${sizeDistString}","${colorDistString}"\n`;
  });
  
  return csvContent;
}

// Add this helper function to generate distribution summary
function getDistributionSummary(variants: Product['variants']) {
  // Get unique sizes and colors
  const sizes = Array.from(new Set(variants.map(v => v.size)));
  const colors = Array.from(new Set(variants.map(v => v.color)));
  
  // Count variants per size and color
  const sizeCount: Record<string, number> = {};
  const colorCount: Record<string, number> = {};
  
  variants.forEach(variant => {
    sizeCount[variant.size] = (sizeCount[variant.size] || 0) + 1;
    colorCount[variant.color] = (colorCount[variant.color] || 0) + 1;
  });
  
  return { sizes, colors, sizeCount, colorCount };
}
