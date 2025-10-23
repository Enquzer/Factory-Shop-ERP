"use client";

import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Product, getProducts } from '@/lib/products';
import { ProductList } from './_components/product-list';

export default function ProductsPage({
    searchParams
}: {
    searchParams?: {
        query?: string;
    }
}) {
    const searchTerm = searchParams?.query || "";
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Use forceRefresh to bypass any caching
                const productsData = await getProducts(true);
                setProducts(productsData);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchProducts();
    }, []);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold">Products</h1>
                    <p className="text-muted-foreground">Manage your product catalog.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <form className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            name="query"
                            placeholder="Search products..."
                            className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] w-full"
                            defaultValue={searchTerm}
                        />
                    </form>
                    <Button asChild>
                        <Link href="/products/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Product
                        </Link>
                    </Button>
                </div>
            </div>

            <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            }>
                <ProductList products={products} query={searchTerm} />
            </Suspense>
        </div>
    );
}