import { getProducts, type Product } from "@/lib/products-sqlite";
import { InventoryClientPage } from "./_components/inventory-client";

export default async function InventoryPage() {
    const products = await getProducts();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Inventory Management</h1>
                    <p className="text-muted-foreground">Manage your product inventory and variants</p>
                </div>
            </div>
            <InventoryClientPage products={products} />
        </div>
    );
}