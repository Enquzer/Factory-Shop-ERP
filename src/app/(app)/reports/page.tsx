import { getProducts, type Product } from "@/lib/products-sqlite";
import { getShops, type Shop } from "@/lib/shops";
import { getOrdersFromDB, type Order } from "@/lib/orders"; // Use server-side function
import { ReportsClientPage } from "./_components/reports-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default async function ReportsPage() {
    // Fetch fresh data directly from database
    const [products, shops, orders] = await Promise.all([
        getProducts(),
        getShops(),
        getOrdersFromDB() // Use server-side function to get fresh data
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Reports</h1>
                <Link href="/dashboard/owner">
                    <Button>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Owner KPI Dashboard
                    </Button>
                </Link>
            </div>
            <ReportsClientPage products={products} shops={shops} orders={orders} />
        </div>
    )
}