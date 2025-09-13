import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Image from "next/image";

const products = [
    { id: "MCT-001", name: "Men's Classic Tee", category: "Men", price: 500.00, imageUrl: "https://picsum.photos/seed/prod1/400/500", imageHint: "man t-shirt" },
    { id: "WSD-012", name: "Women's Summer Dress", category: "Women", price: 1200.00, imageUrl: "https://picsum.photos/seed/prod2/400/500", imageHint: "woman dress" },
    { id: "KGH-034", name: "Kid's Graphic Hoodie", category: "Kids", price: 850.00, imageUrl: "https://picsum.photos/seed/prod3/400/500", imageHint: "kids hoodie" },
    { id: "UDJ-007", name: "Unisex Denim Jacket", category: "Unisex", price: 2500.00, imageUrl: "https://picsum.photos/seed/prod4/400/500", imageHint: "denim jacket" },
    { id: "MST-002", name: "Men's Striped Shirt", category: "Men", price: 950.00, imageUrl: "https://picsum.photos/seed/prod5/400/500", imageHint: "man shirt" },
    { id: "WJP-005", name: "Women's Jumpsuit", category: "Women", price: 1800.00, imageUrl: "https://picsum.photos/seed/prod6/400/500", imageHint: "woman jumpsuit" },
];


export default function ShopProductsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold">Product Catalog</h1>
                    <p className="text-muted-foreground">Browse products and create an order.</p>
                </div>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search products..."
                        className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                    />
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
                            <Button size="sm">Add to Order</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
