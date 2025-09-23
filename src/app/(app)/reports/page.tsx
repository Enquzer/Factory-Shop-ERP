import { getProducts, type Product } from "@/lib/products";
import { getShops, type Shop } from "@/lib/shops";
import { getOrders, type Order } from "@/lib/orders";
import { ReportsClientPage } from "./_components/reports-client";

export default async function ReportsPage() {
    const [products, shops, orders] = await Promise.all([
        getProducts(),
        getShops(),
        getOrders()
    ]);

    return (
        <ReportsClientPage products={products} shops={shops} orders={orders} />
    )
}
