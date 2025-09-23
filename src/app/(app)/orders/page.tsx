
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrders } from "@/lib/orders";
import { OrdersClientPage } from "./_components/orders-client";

export default async function OrdersPage() {
    const allOrders = await getOrders();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Orders</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>View and manage all shop orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OrdersClientPage initialOrders={allOrders} />
                </CardContent>
            </Card>
        </div>
    );
}
