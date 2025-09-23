

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Loader2 } from "lucide-react";
import Link from "next/link";
import { getProducts, type Product } from "@/lib/products";
import { ProductList } from "./_components/product-list";
import { OrderButton } from "./_components/order-button";

export type { Product };

export default function ShopProductsPage({
    searchParams
}: {
    searchParams?: {
        query?: string;
    }
}) {
    const searchTerm = searchParams?.query || "";
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold">Product Catalog</h1>
                    <p className="text-muted-foreground">Browse products and create an order.</p>
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
                    <Suspense fallback={<Button disabled><ShoppingCart className="mr-2 h-4 w-4" /> View Order</Button>}>
                        <OrderButton />
                    </Suspense>
                </div>
            </div>

            <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            }>
                <ProductGrid query={searchTerm} />
            </Suspense>
        </div>
    );
}

async function ProductGrid({ query }: { query: string }) {
    const products = await getProducts();
    const lowercasedTerm = query.toLowerCase();
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(lowercasedTerm) ||
        product.category.toLowerCase().includes(lowercasedTerm) ||
        product.productCode.toLowerCase().includes(lowercasedTerm)
    );

    if (filteredProducts.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No products found for "{query}"</p>
                <p className="text-sm">Try searching for something else.</p>
            </div>
        );
    }
    
    return <ProductList products={filteredProducts} />;
}
