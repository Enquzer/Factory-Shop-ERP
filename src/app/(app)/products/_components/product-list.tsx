"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { EditProductDialog } from "@/components/edit-product-dialog";
import { ProductHistoryDialog } from "@/components/product-history-dialog";
import { useAuth } from '@/contexts/auth-context';
import type { Product } from "@/lib/products";
import { Eye, Edit, History, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { type VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { getProducts, updateProduct } from "@/lib/products";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DateRange } from "react-day-picker";
import { StockDistributionChart } from "@/components/stock-distribution-chart";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export function ProductList({ 
  products, 
  query,
  selectedCategory,
  selectedStatus,
  stockFilter,
  dateRange,
  onProductsDeleted
}: { 
  products: Product[], 
  query: string,
  selectedCategory?: string | null,
  selectedStatus?: string | null,
  stockFilter?: string | null,
  dateRange?: DateRange,
  onProductsDeleted?: () => void
}) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showingHistory, setShowingHistory] = useState<Product | null>(null);
    const [productsState, setProductsState] = useState<Product[]>(products);
    const [updatingStatus, setUpdatingStatus] = useState<{[key: string]: boolean}>({});
    
    // Update productsState when products prop changes
    useEffect(() => {
        setProductsState(products);
    }, [products]);

    // Calculate total stock for a product
    const calculateTotalStock = (product: Product) => {
        return product.variants.reduce((total, variant) => total + variant.stock, 0);
    };

    // Get stock display text and variant
    const getStockDisplay = (product: Product) => {
        const totalStock = calculateTotalStock(product);
        if (totalStock <= 0) {
            return { text: "Out of Stock", variant: "destructive" as BadgeVariant };
        }
        return { text: `${totalStock} in stock`, variant: "secondary" as BadgeVariant };
    };

    const filteredProducts = useMemo(() => {
        let result = [...productsState];
        
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
                // Handle case where created_at might be undefined
                if (!product.created_at) return true;
                
                const productDate = new Date(product.created_at);
                
                // If from date is set, product must be created on or after that date
                if (dateRange.from && productDate < dateRange.from) {
                    return false;
                }
                
                // If to date is set, product must be created on or before that date
                if (dateRange.to && productDate > dateRange.to) {
                    return false;
                }
                
                return true;
            });
        }
        
        return result;
    }, [productsState, query, selectedCategory, selectedStatus, stockFilter, dateRange]);

    const handleDeleteProduct = async (product: Product) => {
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
                // Update local state to remove the product
                setProductsState(prev => prev.filter(p => p.id !== product.id));
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
                description: "Failed to delete the product. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleProductUpdated = async () => {
        console.log('handleProductUpdated called');
        // Instead of reloading the entire page, fetch updated product data
        try {
            // Use forceRefresh to bypass any caching
            const updatedProducts = await getProducts(true);
            console.log('Updated products fetched:', updatedProducts);
            setProductsState(updatedProducts);
            toast({
                title: "Product Updated",
                description: "The product information has been refreshed.",
            });
        } catch (error) {
            console.error('Error refreshing products:', error);
            // Fallback to page reload if API call fails
            window.location.reload();
        }
    };
    
    const handleReadyToDeliverChange = async (product: Product, checked: boolean) => {
        if (user?.role !== 'factory') return;
        
        setUpdatingStatus(prev => ({ ...prev, [product.id]: true }));
        try {
            const success = await updateProduct(product.id, {
                readyToDeliver: checked ? 1 : 0
            });
            
            if (success) {
                // Update local state
                setProductsState(prev => 
                    prev.map(p => 
                        p.id === product.id 
                            ? { ...p, readyToDeliver: checked ? 1 : 0 } 
                            : p
                    )
                );
                
                toast({
                    title: "Product Status Updated",
                    description: `Product "${product.name}" is now ${checked ? 'available' : 'unavailable'} for ordering.`,
                });
            } else {
                throw new Error('Failed to update product status');
            }
        } catch (error) {
            console.error('Error updating product status:', error);
            toast({
                title: "Error",
                description: "Failed to update product status. Please try again.",
                variant: "destructive",
            });
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [product.id]: false }));
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
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product, index) => {
                    const stockInfo = getStockDisplay(product);
                    return (
                        <Card key={product.id} className="overflow-hidden relative group">
                            <div className="relative w-full aspect-[4/5]">
                                <Image 
                                    src={product.imageUrl || '/placeholder-product.png'} 
                                    alt={product.name} 
                                    width={200} 
                                    height={250} 
                                    className="w-full h-40 sm:h-48 object-cover rounded-t-lg"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-product.png';
                                    }}
                                    unoptimized={true}
                                    loading="eager"
                                    // Add priority only to the first 3 products to improve LCP
                                    priority={index < 3}
                                />
                                {/* Action buttons for factory users */}
                                {user?.role === 'factory' && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="h-8 w-8"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="h-8 w-8"
                                            onClick={() => setEditingProduct(product)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="h-8 w-8"
                                            onClick={() => setShowingHistory(product)}
                                        >
                                            <History className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="destructive" 
                                            className="h-8 w-8"
                                            onClick={() => handleDeleteProduct(product)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <CardHeader className="p-3 sm:p-6">
                                <CardTitle className="text-base sm:text-lg">{product.name}</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">{product.productCode}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-1">
                                    <p className="text-base sm:text-lg font-semibold">ETB {product.price.toFixed(2)}</p>
                                    <div className="flex items-center text-sm">
                                        <Package className="h-4 w-4 mr-1" />
                                        <Badge variant={stockInfo.variant} className="text-xs">{stockInfo.text}</Badge>
                                    </div>
                                    {/* Factory controls for readyToDeliver */}
                                    {user?.role === 'factory' && (
                                        <div className="flex items-center space-x-2 pt-2">
                                            <Switch
                                                id={`ready-to-deliver-${product.id}`}
                                                checked={product.readyToDeliver === 1}
                                                onCheckedChange={(checked) => handleReadyToDeliverChange(product, checked)}
                                                disabled={updatingStatus[product.id]}
                                            />
                                            <Label htmlFor={`ready-to-deliver-${product.id}`} className="text-xs">
                                                {product.readyToDeliver === 1 ? "Available" : "Unavailable"}
                                            </Label>
                                        </div>
                                    )}
                                </div>
                                {/* Stock Distribution Chart */}
                                <div className="mt-2">
                                  <StockDistributionChart 
                                    product={product}
                                    viewType="factory"
                                  />
                                </div>
                                <Button size="sm" className="text-xs sm:text-sm h-8" onClick={() => setSelectedProduct(product)}>View Options</Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

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
                    onProductUpdated={handleProductUpdated}
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
        </>
    );
}