import { getProducts } from "@/lib/products-sqlite";
import { getShops } from "@/lib/shops";
import { getOrdersFromDB } from "@/lib/orders";
import { getMarketingOrdersFromDB } from "@/lib/marketing-orders";
import { OwnerDashboardClientPage } from "@/app/(app)/dashboard/owner/_components/owner-dashboard-client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerDashboardPage() {
    // Fetch fresh data directly from database
    const [products, shops, orders, marketingOrders] = await Promise.all([
        getProducts(),
        getShops(),
        getOrdersFromDB(),
        getMarketingOrdersFromDB()
    ]);

    return (
        <OwnerDashboardClientPage 
            products={products} 
            shops={shops} 
            orders={orders} 
            marketingOrders={marketingOrders} 
        />
    )
}