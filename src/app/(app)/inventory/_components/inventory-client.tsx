"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/lib/products";
import { InventoryDashboard } from "./inventory-dashboard";
import { InventoryFilters } from "./inventory-filters";
import { InventoryTable } from "./inventory-table";
import { ProductViewDialog } from "./product-view-dialog";
import { EditProductDialog } from "@/components/edit-product-dialog"; // Add this import
import { FileText } from "lucide-react";

interface FilterOptions {
  searchTerm: string;
  category: string;
  minStock: string;
  maxStock: string;
}

export function InventoryClientPage({ products: initialProducts }: { products: Product[] }) {
  const [products] = useState<Product[]>(initialProducts);
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
    category: "all",
    minStock: "",
    maxStock: ""
  });
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null); // Add this state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // Add this state
  const { toast } = useToast();

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const totalProducts = products.length;
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);
    const totalValue = products.reduce(
      (sum, product) => 
        sum + (product.price * product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0)),
      0
    );
    
    return {
      totalProducts,
      totalVariants,
      totalValue
    };
  }, [products]);

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const uniqueCategories = new Set(products.map(product => product.category));
    return Array.from(uniqueCategories);
  }, [products]);

  // Filter products based on filter criteria
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search term filter
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        if (!product.name.toLowerCase().includes(term) && 
            !product.productCode.toLowerCase().includes(term) &&
            !product.category.toLowerCase().includes(term)) {
          return false;
        }
      }
      
      // Category filter
      if (filters.category !== "all" && product.category !== filters.category) {
        return false;
      }
      
      // Stock filters
      const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      
      if (filters.minStock && totalStock < parseInt(filters.minStock)) {
        return false;
      }
      
      if (filters.maxStock && totalStock > parseInt(filters.maxStock)) {
        return false;
      }
      
      return true;
    });
  }, [products, filters]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    toast({
      title: "Delete Product",
      description: `Deleting product with ID: ${productId}`
    });
    // In a real implementation, this would show a confirmation and delete the product
  };

  const handleViewProduct = (product: Product) => {
    setViewProduct(product);
    setIsViewDialogOpen(true);
  };

  const handleExportToPDF = async () => {
    try {
      // Build query string with current filters
      const params = new URLSearchParams();
      if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.minStock) params.append('minStock', filters.minStock);
      if (filters.maxStock) params.append('maxStock', filters.maxStock);
      
      const queryString = params.toString();
      const url = `/api/inventory/export${queryString ? `?${queryString}` : ''}`;
      
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = 'inventory-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Inventory report generated and downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle product update callback
  const handleProductUpdated = () => {
    toast({
      title: "Product Updated",
      description: "The product has been successfully updated.",
    });
    // In a real implementation, you would refresh the product list
  };

  return (
    <div className="space-y-6">
      <InventoryDashboard 
        totalProducts={dashboardMetrics.totalProducts}
        totalVariants={dashboardMetrics.totalVariants}
        totalValue={dashboardMetrics.totalValue}
      />
      
      <InventoryFilters 
        onFilterChange={handleFilterChange}
        categories={categories}
      />
      
      <div className="flex justify-end mb-4">
        <Button onClick={handleExportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export to PDF
        </Button>
      </div>
      
      <InventoryTable
        products={filteredProducts}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
        onView={handleViewProduct}
      />
      
      <ProductViewDialog 
        product={viewProduct} 
        open={isViewDialogOpen} 
        onClose={() => setIsViewDialogOpen(false)} 
      />
      
      {editProduct && (
        <EditProductDialog
          product={editProduct}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onProductUpdated={handleProductUpdated}
        />
      )}
    </div>
  );
}