"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useOrder } from "@/hooks/use-order";
import Link from "next/link";
import { ProductDetailDialog } from "@/components/product-detail-dialog";
import { products, type Product, type ProductVariant as LocalProductVariant } from "@/lib/products";

// Re-exporting for use in other components that import from this file.
export type { Product, LocalProductVariant as ProductVariant };

export default function ShopProductsPage() {
    const { items } = useOrder();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold">Product Catalog</h1>
                    <p className="text-muted-foreground">Browse products and create an order.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search products..."
                            className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                        />
                    </div>
                    {items.length > 0 && (
                        <Button asChild>
                            <Link href="/shop/orders/create">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                View Order
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                        <div className="relative w-full aspect-[4/5]">
                            <Image src={product.imageUrl} alt={product.name} fill style={{objectFit: 'cover'}} data-ai-hint={product.imageHint} />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <CardDescription>{product.category}</CardDescription>
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
        </div>
    );
}
