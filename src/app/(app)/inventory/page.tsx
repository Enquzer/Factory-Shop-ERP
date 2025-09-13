import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const allProducts = [
    { 
        id: "MCT-001", 
        name: "Men's Classic Tee", 
        category: "Men", 
        variants: [
            { id: "VAR-001", color: "White", size: "M", stock: 15 },
            { id: "VAR-002", color: "White", size: "L", stock: 10 },
            { id: "VAR-003", color: "Black", size: "M", stock: 20 },
            { id: "VAR-004", color: "Black", size: "XL", stock: 5 },
        ]
    },
    { 
        id: "WSD-012", 
        name: "Women's Summer Dress", 
        category: "Women", 
        variants: [
            { id: "VAR-005", color: "Floral", size: "S", stock: 8 },
            { id: "VAR-006", color: "Floral", size: "M", stock: 12 },
        ]
    },
    { 
        id: "KGH-034", 
        name: "Kid's Graphic Hoodie", 
        category: "Kids", 
        variants: [
            { id: "VAR-007", color: "Blue", size: "6Y", stock: 18 },
            { id: "VAR-008", color: "Pink", size: "8Y", stock: 22 },
        ]
    },
    { 
        id: "UDJ-007", 
        name: "Unisex Denim Jacket", 
        category: "Unisex", 
        variants: [
            { id: "VAR-009", color: "Indigo", size: "L", stock: 7 },
        ]
    },
     { 
        id: "MST-002", 
        name: "Men's Striped Shirt", 
        category: "Men", 
        variants: [
            { id: "VAR-010", color: "Navy/White", size: "M", stock: 14 },
            { id: "VAR-011", color: "Navy/White", size: "L", stock: 11 },
        ]
    },
    { 
        id: "WJP-005", 
        name: "Women's Jumpsuit", 
        category: "Women", 
        variants: [
            { id: "VAR-012", color: "Black", size: "S", stock: 9 },
            { id: "VAR-013", color: "Olive", size: "M", stock: 6 },
        ]
    },
];

const LOW_STOCK_THRESHOLD = 10;

export default function InventoryPage() {
    
    const getTotalStock = (variants: { stock: number }[]) => {
        return variants.reduce((total, variant) => total + variant.stock, 0);
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Inventory Status</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Product Inventory</CardTitle>
                    <CardDescription>An overview of the stock levels for each product and its variants.</CardDescription>
                </CardHeader>
                <CardContent>
                    {allProducts.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {allProducts.map(product => {
                                const totalStock = getTotalStock(product.variants);
                                const isLowStock = totalStock < LOW_STOCK_THRESHOLD * product.variants.length; // Example logic

                                return (
                                    <AccordionItem value={product.id} key={product.id}>
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-4">
                                                <span className="font-medium">{product.name}</span>
                                                <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                                                    Total Stock: {totalStock}
                                                </Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Color</TableHead>
                                                        <TableHead>Size</TableHead>
                                                        <TableHead className="text-right">Stock Quantity</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {product.variants.map(variant => (
                                                        <TableRow key={variant.id}>
                                                            <TableCell>{variant.color}</TableCell>
                                                            <TableCell>{variant.size}</TableCell>
                                                            <TableCell className={`text-right font-medium ${variant.stock < LOW_STOCK_THRESHOLD ? 'text-destructive' : ''}`}>
                                                                {variant.stock}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                         <div className="text-center py-12 text-muted-foreground">
                            <p>No products found in inventory.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
