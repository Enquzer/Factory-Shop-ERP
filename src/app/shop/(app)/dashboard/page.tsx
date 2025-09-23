import {
    ArrowDownUp,
    Package,
    ShoppingCart,
  } from "lucide-react"
  
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOrdersForShop } from '@/lib/orders';
import { getProducts } from '@/lib/products';
import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from "@/lib/orders";

const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: 'default',
    'Awaiting Payment': 'secondary',
    Paid: 'outline',
    Dispatched: 'outline',
    Delivered: 'secondary',
    Cancelled: 'destructive'
};

// This is a placeholder. In a real app, you'd get this from the user's session.
const MOCK_SHOP_ID = "SHP-001";

export default async function ShopDashboardPage() {
    const [orders, products] = await Promise.all([
        getOrdersForShop(MOCK_SHOP_ID),
        getProducts()
    ]);
    const totalProducts = products.length;

    const metrics = {
      pendingOrders: orders.filter(o => o.status === 'Pending' || o.status === 'Awaiting Payment').length,
      dispatchedOrders: orders.filter(o => o.status === 'Dispatched').length,
      totalProductsAvailable: totalProducts,
    };
    
    const recentOrders = orders.slice(0, 5);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">My Dashboard</h1>
            <Button asChild>
                <Link href="/shop/products">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Start New Order
                </Link>
            </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Products Available
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProductsAvailable}</div>
              <p className="text-xs text-muted-foreground">
                Total items in the factory catalog
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.pendingOrders}</div>
              <p className="text-xs text-muted-foreground">
                Orders awaiting confirmation or payment
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dispatched Orders
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.dispatchedOrders}</div>
              <p className="text-xs text-muted-foreground">
                Orders currently on their way
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>My Recent Orders</CardTitle>
                <CardDescription>A quick look at your most recent order activity.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentOrders.length > 0 ? (
                        recentOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariants[order.status]}>{order.status}</Badge>
                                </TableCell>
                                <TableCell>{order.date}</TableCell>
                                <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                You haven't placed any orders yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    )
}
