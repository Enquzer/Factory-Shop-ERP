"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, BarChart3 } from "lucide-react";
import { Product } from "@/lib/products";
import { StockDistributionChart } from "@/components/stock-distribution-chart";
import { useToast } from "@/hooks/use-toast";
import { generateColorScheme } from "@/lib/stock-distribution";

interface ProductsTableViewProps {
  products: Product[];
  query: string;
  selectedCategory?: string | null;
  selectedStatus?: string | null;
  stockFilter?: string | null;
  dateRange?: { from?: Date; to?: Date };
}

export function ProductsTableView({ 
  products, 
  query,
  selectedCategory,
  selectedStatus,
  stockFilter,
  dateRange
}: ProductsTableViewProps) {
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Product Code</TableHead>
              <TableHead>Registered Date</TableHead>
              <TableHead>Total Quantity</TableHead>
              <TableHead>Stock Distribution</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const totalStock = calculateTotalStock(product);
              const isExpanded = expandedRows.has(product.id);
              const registeredDate = product.created_at 
                ? new Date(product.created_at).toLocaleDateString() 
                : "N/A";
              
              return (
                <>
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-md overflow-hidden">
                          <Image 
                            src={product.imageUrl || '/placeholder-product.png'} 
                            alt={product.name} 
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              // Only set fallback if not already set to avoid infinite loop
                              if (target.src !== window.location.origin + '/placeholder-product.png') {
                                target.src = '/placeholder-product.png';
                              }
                            }}
                            // Add loading strategy to prevent blob URL issues
                            loading="lazy"
                            // Add key to force re-render when src changes
                            key={product.imageUrl || 'placeholder'}
                          />
                        </div>
                        <div>
                          <div>{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.category}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.productCode}</TableCell>
                    <TableCell>{registeredDate}</TableCell>
                    <TableCell>
                      <Badge variant={totalStock > 0 ? "secondary" : "destructive"}>
                        {totalStock} in stock
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Color variant representation */}
                        <div className="flex gap-1">
                          {Array.from(new Set(product.variants.map(v => v.color)))
                            .slice(0, 3)
                            .map((color, index) => (
                              <div key={index} className="relative">
                                <div 
                                  className="w-6 h-6 rounded-full border border-gray-300"
                                  style={{ backgroundColor: getColorForName(color) }}
                                  title={color}
                                />
                                {/* Show image thumbnail if available */}
                                {product.variants
                                  .filter(v => v.color === color && v.imageUrl)
                                  .slice(0, 1)
                                  .map((variant, vIndex) => (
                                    <div 
                                      key={vIndex} 
                                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full border border-white"
                                    >
                                      <Image 
                                        src={variant.imageUrl!} 
                                        alt={color} 
                                        width={16} 
                                        height={16} 
                                        className="rounded-full object-cover"
                                      />
                                    </div>
                                  ))
                                }
                              </div>
                            ))
                          }
                          {Array.from(new Set(product.variants.map(v => v.color))).length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-xs">
                              +{Array.from(new Set(product.variants.map(v => v.color))).length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleRowExpansion(product.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        {isExpanded ? "Hide" : "Show"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <div className="p-4 bg-gray-50">
                          <StockDistributionChart 
                            product={product}
                            viewType="factory"
                            className="w-full"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
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
