import { getProducts } from "@/lib/products-sqlite";
import { InventoryClientPage } from "../../inventory/_components/inventory-client";
import { BulkSelectionProvider } from "@/contexts/bulk-selection-context";

export default async function StoreInventoryPage() {
    const products = await getProducts();

    return (
        <BulkSelectionProvider>
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Store Inventory
                    </h1>
                    <p className="text-muted-foreground">Manage and track full factory finished goods inventory.</p>
                </div>
            </div>
            {/* We reuse the factory inventory client page which provides search, filter, and dashboard metrics */}
            <InventoryClientPage products={products} />
        </div>
        </BulkSelectionProvider>
    );
}
