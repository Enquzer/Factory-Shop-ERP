

"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { AddProductDialog } from "@/components/add-product-dialog";
import { Product, deleteProduct, getProducts } from '@/lib/products';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ProductDetailDialog } from '@/components/product-detail-dialog-view';
import { EditProductDialog } from '@/components/edit-product-dialog';


export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productToView, setProductToView] = useState<Product | null>(null);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const fetchProducts = async () => {
        setIsLoading(true);
        const productsData = await getProducts();
        setProducts(productsData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const onProductAdded = () => {
      fetchProducts();
    }

    const onProductUpdated = () => {
      fetchProducts();
      setProductToEdit(null);
    }

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            await deleteProduct(productToDelete.id);
            toast({
                title: "Product Deleted",
                description: `"${productToDelete.name}" has been removed from your catalog.`,
            });
            setProductToDelete(null);
            fetchProducts();
        } catch (error) {
            console.error("Error deleting product:", error);
            toast({
                title: "Error",
                description: "Failed to delete product. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    }


    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold self-start sm:self-center">Products</h1>
                <AddProductDialog onProductAdded={onProductAdded}>
                    <Button className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </AddProductDialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Product List</CardTitle>
                    <CardDescription>Manage your product catalog here.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No products yet.</p>
                            <p className="text-sm">Click "Add Product" to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {products.map(product => (
                                <Card key={product.id} className="overflow-hidden group">
                                    <div className="relative w-full aspect-[4/5]">
                                        <Image src={product.imageUrl} alt={product.name} fill style={{objectFit: 'cover'}} />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <Button size="icon" variant="secondary" onClick={() => setProductToView(product)}>
                                                <Eye className="h-5 w-5" />
                                                <span className="sr-only">View Product</span>
                                            </Button>
                                            <Button size="icon" variant="secondary" onClick={() => setProductToEdit(product)}>
                                                <Pencil className="h-5 w-5" />
                                                 <span className="sr-only">Edit Product</span>
                                            </Button>
                                            <Button size="icon" variant="destructive" onClick={() => setProductToDelete(product)}>
                                                <Trash2 className="h-5 w-5" />
                                                 <span className="sr-only">Delete Product</span>
                                            </Button>
                                        </div>
                                    </div>
                                    <CardHeader className='pb-2'>
                                        <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                                        <CardDescription>{product.productCode}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex items-center justify-between">
                                        <p className="text-lg font-semibold">ETB {product.price.toFixed(2)}</p>
                                        <Badge>Total Stock: {product.variants.reduce((acc, v) => acc + v.stock, 0)}</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View Product Dialog */}
            {productToView && (
                <ProductDetailDialog
                    product={productToView}
                    open={!!productToView}
                    onOpenChange={(isOpen) => !isOpen && setProductToView(null)}
                />
            )}
            
            {/* Edit Product Dialog */}
            {productToEdit && (
                <EditProductDialog
                    product={productToEdit}
                    open={!!productToEdit}
                    onOpenChange={(isOpen) => !isOpen && setProductToEdit(null)}
                    onProductUpdated={onProductUpdated}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!productToDelete} onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the product
                        "{productToDelete?.name}" and all its associated data from the database.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                        {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}

    
