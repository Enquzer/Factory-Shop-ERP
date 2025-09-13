import {
  ArrowDownUp,
  Building2,
  Package,
  Wallet,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

// Mock Data based on the XML specification
const dashboardData = {
  metrics: {
    totalRevenue: 4523189.00,
    revenueChange: "+20.1%",
    registeredShops: 23,
    newShops: 5,
    totalProducts: 1257,
    newProducts: 12,
    activeOrders: 57,
    newOrders: 19,
  },
  recentOrders: [
    { id: "ORD-001", shopName: "Bole Boutique", location: "Addis Ababa", status: "Dispatched", amount: 25000.00, statusVariant: "outline" },
    { id: "ORD-002", shopName: "Hawassa Habesha", location: "Hawassa", status: "Awaiting Payment", amount: 15000.00, statusVariant: "default" },
    { id: "ORD-003", shopName: "Merkato Style", location: "Addis Ababa", status: "Rejected", amount: 35000.00, statusVariant: "destructive" },
    { id: "ORD-004", shopName: "Adama Modern", location: "Adama", status: "Fulfilled", amount: 45000.00, statusVariant: "secondary" },
  ],
  lowStockItems: [
    { id: "MCT-001", name: "Men's Classic Tee", category: "Men", stock: 5, isLow: true },
    { id: "WSD-012", name: "Women's Summer Dress", category: "Women", stock: 8, isLow: true },
    { id: "KGH-034", name: "Kid's Graphic Hoodie", category: "Kids", stock: 22, isLow: false },
    { id: "UDJ-007", name: "Unisex Denim Jacket", category: "Unisex", stock: 3, isLow: true },
  ]
};

export default function DashboardPage() {
  const { metrics, recentOrders, lowStockItems } = dashboardData;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ETB {metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.revenueChange} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registered Shops
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.registeredShops}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.newShops} since last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.newProducts} new products this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Orders
            </CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.activeOrders}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics.newOrders} since last week
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>An overview of the most recent shop orders.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">{order.shopName}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.statusVariant as any}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Products that are running low on inventory.</CardDescription>
          </CardHeader>
          <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock Left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        #{item.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.category}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${item.isLow ? 'text-destructive' : ''}`}>{item.stock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
