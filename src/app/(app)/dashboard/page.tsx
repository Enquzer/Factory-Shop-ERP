import { getOrdersFromDB } from "@/lib/orders";
import { getProducts } from "@/lib/products-sqlite";
import { getShops } from "@/lib/shops";
import { getMarketingOrdersFromDB } from "@/lib/marketing-orders";
import { getRawMaterials } from "@/lib/raw-materials";
import { DashboardClientPage } from "./_components/dashboard-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
    try {
        const [products, orders, shops, marketingOrders, rawMaterials] = await Promise.all([
            getProducts(),
            getOrdersFromDB(),
            getShops(),
            getMarketingOrdersFromDB(),
            getRawMaterials()
        ]);

        return (
            <DashboardClientPage
                products={products}
                orders={orders}
                shops={shops}
                marketingOrders={marketingOrders}
                rawMaterials={rawMaterials}
            />
        )
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        return (
            <div className="flex items-center justify-center h-full">
                <div>Error loading dashboard. Please try again later.</div>
            </div>
        );
    }
}