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

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export function ProductList({ products, query }: { products: Product[], query: string }) {
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

    const filteredProducts = useMemo(() => {
        const lowercasedTerm = query.toLowerCase();
        if (!lowercasedTerm) return productsState;

        return productsState.filter(product =>
            product.name.toLowerCase().includes(lowercasedTerm) ||
            product.category.toLowerCase().includes(lowercasedTerm) ||
            product.productCode.toLowerCase().includes(lowercasedTerm)
        );
    }, [productsState, query]);

    const handleDeleteProduct = async (product: Product) => {
        if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/products?id=${product.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Update local state to remove the product
                setProductsState(prev => prev.filter(p => p.id !== product.id));
                toast({
                    title: "Product Deleted",
                    description: `"${product.name}" has been deleted successfully.`,
                });
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

    if (filteredProducts.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No products found for "{query}"</p>
                <p className="text-sm">Try searching for something else.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                                    className="w-full h-48 object-cover rounded-t-lg"
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
                            <CardHeader>
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <CardDescription>{product.productCode}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-lg font-semibold">ETB {product.price.toFixed(2)}</p>
                                    <div className="flex items-center text-sm">
                                        <Package className="h-4 w-4 mr-1" />
                                        <Badge variant={stockInfo.variant}>{stockInfo.text}</Badge>
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
                                <Button size="sm" onClick={() => setSelectedProduct(product)}>View Options</Button>
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