
"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import type { Product } from "@/lib/products";


export function ProductList({ products }: { products: Product[] }) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
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
