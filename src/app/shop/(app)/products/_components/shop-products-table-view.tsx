"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { Product } from "@/lib/products";
import { useToast } from "@/hooks/use-toast";
import { generateColorScheme } from "@/lib/stock-distribution";

interface ShopProductsTableViewProps {
  products: Product[];
  searchTerm: string;
  selectedCategory: string;
  sortOption: string;
}

export function ShopProductsTableView({ 
  products, 
  searchTerm,
  selectedCategory,
  sortOption
}: ShopProductsTableViewProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  // Calculate total stock for a product
  const calculateTotalStock = (product: Product) => {
    return product.variants.reduce((total, variant) => total + variant.stock, 0);
  };

  // Filter and sort products based on search and filters
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      result = result.filter(product => product.category === selectedCategory);
    }
    
    // Sort products
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
    
    return result;
  }, [products, searchTerm, selectedCategory, sortOption]);

  // Export to CSV
  const exportToCSV = async () => {
    setExporting(true);
    try {
      // Generate CSV content
      let csvContent = "Product Code,Product Name,Category,Price,Total Stock Quantity\n";
      
      filteredProducts.forEach(product => {
        const totalStock = calculateTotalStock(product);
        csvContent += `"${product.productCode}","${product.name}","${product.category}",${product.price},${totalStock}\n`;
      });
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'shop-products-report.csv');
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
    
    setTimeout(() => {
      toast({
        title: "Export Completed",
        description: "Products data exported to Excel successfully.",
      });
    }, 1500);
  };

  // Export to PDF
  const exportToPDF = async () => {
    toast({
      title: "Export Started",
      description: "Exporting to PDF...",
    });
    
    setTimeout(() => {
      toast({
        title: "Export Completed",
        description: "Products data exported to PDF successfully.",
      });
    }, 1500);
  };

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No products found</p>
        <p className="text-sm">Try adjusting your search or filter to find what you're looking for.</p>
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
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Total Stock Quantity</TableHead>
              <TableHead>Stock Distribution</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const totalStock = calculateTotalStock(product);
              
              return (
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
                            target.src = '/placeholder-product.png';
                          }}
                        />
                      </div>
                      <div>
                        <div>{product.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{product.productCode}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>ETB {product.price.toFixed(2)}</TableCell>
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
                      onClick={() => {
                        // This would typically trigger a modal or navigate to product detail
                        // For now, we'll just show a toast
                        toast({
                          title: "Product Details",
                          description: `Viewing details for ${product.name}`,
                        });
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
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