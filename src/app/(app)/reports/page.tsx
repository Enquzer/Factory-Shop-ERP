import { getProducts, type Product } from "@/lib/products-sqlite";
import { getShops, type Shop } from "@/lib/shops";
import { getOrdersFromDB, type Order } from "@/lib/orders"; // Use server-side function
import { ReportsClientPage } from "./_components/reports-client";

export default async function ReportsPage() {
    // Fetch fresh data directly from database
    const [products, shops, orders] = await Promise.all([
        getProducts(),
        getShops(),
        getOrdersFromDB() // Use server-side function to get fresh data
    ]);

    return (
        <ReportsClientPage products={products} shops={shops} orders={orders} />
    )
}