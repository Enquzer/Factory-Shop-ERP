import { OrdersClientPage } from "./_components/orders-client";
import { getOrdersFromDB } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OrdersDashboard } from "./_components/orders-dashboard";
import { BulkSelectionProvider } from "@/contexts/bulk-selection-context";

export default async function OrdersPage() {
  const initialOrders = await getOrdersFromDB();
  
  return (
    <BulkSelectionProvider>
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Factory Orders</h1>
        <Button asChild>
          <Link href="/orders/tracking">View Order Tracking</Link>
        </Button>
      </div>
      <OrdersDashboard orders={initialOrders} />
      <OrdersClientPage initialOrders={initialOrders} />
    </div>
    </BulkSelectionProvider>
  );
}