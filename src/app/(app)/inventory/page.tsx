import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { products as allProducts } from "@/lib/products";

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
