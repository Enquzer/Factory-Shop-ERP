import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getProducts, type Product } from "@/lib/products";
import { InventoryClientPage } from "./_components/inventory-client";

export default async function InventoryPage() {
    const products = await getProducts();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Inventory Status</h1>
            </div>
            <InventoryClientPage products={products} />
        </div>
    );
}
