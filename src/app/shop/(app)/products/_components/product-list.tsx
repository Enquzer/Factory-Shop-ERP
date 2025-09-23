
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import type { Product } from "@/lib/products";


export function ProductList({ products, query }: { products: Product[], query: string }) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const filteredProducts = useMemo(() => {
        const lowercasedTerm = query.toLowerCase();
        if (!lowercasedTerm) return products;

        return products.filter(product =>
            product.name.toLowerCase().includes(lowercasedTerm) ||
            product.category.toLowerCase().includes(lowercasedTerm) ||
            product.productCode.toLowerCase().includes(lowercasedTerm)
        );
    }, [products, query]);

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
                {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                        <div className="relative w-full aspect-[4/5]">
                            <Image src={product.imageUrl} alt={product.name} fill style={{objectFit: 'cover'}} />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <CardDescription>{product.productCode}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <p className="text-lg font-semibold">ETB {product.price.toFixed(2)}</p>
                            <Button size="sm" onClick={() => setSelectedProduct(product)}>View Options</Button>
                        </CardContent>
                    </Card>
                ))}
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
        </>
    );
}