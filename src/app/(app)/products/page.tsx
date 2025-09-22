
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2 } from "lucide-react";
import { AddProductDialog } from "@/components/add-product-dialog";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Product } from '@/lib/products';
import Image from 'next/image';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            const productsQuery = query(collection(db, 'products'), orderBy('name'));
            const productsSnapshot = await getDocs(productsQuery);
            const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(productsData);
            setIsLoading(false);
        };

        fetchProducts();
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold self-start sm:self-center">Products</h1>
                <AddProductDialog>
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
                                <Card key={product.id} className="overflow-hidden">
                                    <div className="relative w-full aspect-[4/5]">
                                        <Image src={product.imageUrl} alt={product.name} fill style={{objectFit: 'cover'}} data-ai-hint={product.imageHint} />
                                    </div>
                                    <CardHeader className='pb-2'>
                                        <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                                        <CardDescription>{product.category}</CardDescription>
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
        </div>
    );
}

    