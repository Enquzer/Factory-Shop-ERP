import {
    ArrowDownUp,
    Package,
    ShoppingCart
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
  
  const shopDashboardData = {
    metrics: {
      pendingOrders: 3,
      dispatchedOrders: 2,
      totalProductsAvailable: 150,
    },
    recentOrders: [
      { id: "ORD-005", status: "Dispatched", amount: 1250.00, date: "2023-10-26" },
      { id: "ORD-006", status: "Pending", amount: 850.50, date: "2023-10-27" },
      { id: "ORD-007", status: "Delivered", amount: 3200.00, date: "2023-10-22" },
    ],
  };
  
  export default function ShopDashboardPage() {
    const { metrics, recentOrders } = shopDashboardData;
  
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
                Orders awaiting factory confirmation
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
                    {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell>{order.date}</TableCell>
                        <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    )
  }