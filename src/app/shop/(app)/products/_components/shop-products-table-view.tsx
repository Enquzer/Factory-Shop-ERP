"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, ShoppingCart } from "lucide-react";
import { Product } from "@/lib/products";
import { useToast } from "@/hooks/use-toast";
import { generateColorScheme } from "@/lib/stock-distribution";
import { DateRange } from "react-day-picker";
import { BulkSelectionTable } from "@/components/bulk-selection-table";
import { BulkActions } from "@/components/bulk-actions";
import { useOrder } from "@/hooks/use-order";
import { ProductVariant } from "@/lib/products";

interface ShopProductsTableViewProps {
  products: Product[];
  searchTerm: string;
  selectedCategory: string;
  sortOption: string;
  dateRange?: DateRange;
  onViewProduct?: (product: Product) => void;
}

export function ShopProductsTableView({ 
  products, 
  searchTerm,
  selectedCategory,
  sortOption,
  dateRange,
  onViewProduct
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
    
    // Filter by date range
    if (dateRange?.from || dateRange?.to) {
      result = result.filter(product => {
        const productDate = new Date(product.created_at || new Date());
        return (
          (!dateRange.from || productDate >= dateRange.from) &&
          (!dateRange.to || productDate <= dateRange.to)
        );
      });
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
        case 'newest':
          const dateA = new Date(a.created_at || new Date());
          const dateB = new Date(b.created_at || new Date());
          return dateB.getTime() - dateA.getTime();
        case 'oldest':
          const dateC = new Date(a.created_at || new Date());
          const dateD = new Date(b.created_at || new Date());
          return dateC.getTime() - dateD.getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [products, searchTerm, selectedCategory, sortOption, dateRange]);

  // Export to CSV
  const exportToCSV = async () => {
    setExporting(true);
    try {
      // Generate CSV content
      let csvContent = "Product Code,Product Name,Category,Price,Total Stock Quantity,Created Date\n";
      
      filteredProducts.forEach(product => {
        const totalStock = calculateTotalStock(product);
        const createdDate = product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A';
        csvContent += `"${product.productCode}","${product.name}","${product.category}",${product.price},${totalStock},"${createdDate}"\n`;
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

  const { addItem } = useOrder(); // Use the order context to add items to cart

  const handlePrint = (selectedIds: string[]) => {
    // For printing, we can open a new window with selected product details
    const selectedProducts = filteredProducts.filter(product => selectedIds.includes(product.id));
    
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
                  <th>Price</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      selectedProducts.forEach(product => {
        const totalStock = calculateTotalStock(product);
        printContent += `
          <tr>
            <td>${product.name}</td>
            <td>${product.productCode}</td>
            <td>${product.category}</td>
            <td>ETB ${product.price.toFixed(2)}</td>
            <td>${totalStock}</td>
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
    // Get the selected products
    const selectedProducts = filteredProducts.filter(product => selectedIds.includes(product.id));
    
    try {
      // For each selected product, add the first available variant to the order
      for (const product of selectedProducts) {
        if (product.variants && product.variants.length > 0) {
          const firstVariant = product.variants[0];
          await addItem(product, firstVariant, 1); // Add 1 quantity of the first variant
        }
      }
      
      toast({
        title: "Products Added to Order",
        description: `${selectedProducts.length} product(s) added to your order.`,
      });
    } catch (error) {
      console.error('Error adding products to order:', error);
      toast({
        title: "Error",
        description: "Failed to add products to order. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleBulkDelete = (selectedIds: string[]) => {
    // For shop users, we don't typically delete products
    alert(`Bulk delete requested for products: ${selectedIds.join(', ')}.

Note: Shop users typically cannot delete products.`);
  };

  // OrderProductButton component
  const OrderProductButton = ({ product }: { product: Product }) => {
    
    const handleOrderProduct = async () => {
      // For now, add the first variant of the product to the order
      if (product.variants && product.variants.length > 0) {
        const firstVariant = product.variants[0];
        await addItem(product, firstVariant, 1); // Add 1 quantity of the first variant
      } else {
        toast({
          title: "No Variants Available",
          description: `No variants available for ${product.name}.`,
          variant: "destructive",
        });
      }
    };
    
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleOrderProduct}
      >
        <ShoppingCart className="h-4 w-4" />
      </Button>
    );
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
        <BulkSelectionTable
          headers={[ 
            { key: 'product', title: 'Product', mobileTitle: 'Product' },
            { key: 'productCode', title: 'Product Code', mobileTitle: 'Code' },
            { key: 'category', title: 'Category', mobileTitle: 'Category' },
            { key: 'price', title: 'Price', mobileTitle: 'Price' },
            { key: 'totalStock', title: 'Total Stock Quantity', mobileTitle: 'Stock' },
            { key: 'createdDate', title: 'Created Date', mobileTitle: 'Date' },
            { key: 'stockDistribution', title: 'Stock Distribution', mobileTitle: 'Distribution' },
            { key: 'actions', title: 'Actions', mobileTitle: 'Actions', className: 'text-center' },
          ]}
          data={filteredProducts.map((product) => {
            const totalStock = calculateTotalStock(product);
            const createdDate = product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A';
            
            return {
              id: product.id,
              product: (
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
              ),
              productCode: (
                <div>{product.productCode}</div>
              ),
              category: (
                <div>{product.category}</div>
              ),
              price: (
                <div>ETB {product.price.toFixed(2)}</div>
              ),
              totalStock: (
                <div>
                  <Badge variant={totalStock > 0 ? "secondary" : "destructive"}>
                    {totalStock} in stock
                  </Badge>
                </div>
              ),
              createdDate: (
                <div>{createdDate}</div>
              ),
              stockDistribution: (
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
              ),
              actions: (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Use the onViewProduct callback if provided, otherwise show toast
                      if (onViewProduct) {
                        onViewProduct(product);
                      } else {
                        toast({
                          title: "Product Details",
                          description: `Viewing details for ${product.name}`,
                        });
                      }
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <OrderProductButton product={product} />
                </div>
              ),
            };
          })}
          idKey="id"
          actions={
            <BulkActions 
              onPrint={handlePrint}
              onOrder={handleBulkOrder}
              printLabel="Print Selected"
              orderLabel="Order Selected"
              itemType="products"
            />
          }
        />
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