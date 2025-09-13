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

export default function DashboardPage() {
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
            <div className="text-2xl font-bold">ETB 4,523,189.00</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
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
            <div className="text-2xl font-bold">+23</div>
            <p className="text-xs text-muted-foreground">
              +5 since last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,257</div>
            <p className="text-xs text-muted-foreground">
              +12 new products this month
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
            <div className="text-2xl font-bold">+57</div>
            <p className="text-xs text-muted-foreground">
              +19 since last week
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
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Bole Boutique</div>
                    <div className="text-sm text-muted-foreground">
                      Addis Ababa
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Dispatched</Badge>
                  </TableCell>
                  <TableCell className="text-right">ETB 25,000.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Hawassa Habesha</div>
                    <div className="text-sm text-muted-foreground">
                      Hawassa
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge>Awaiting Payment</Badge>
                  </TableCell>
                  <TableCell className="text-right">ETB 15,000.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Merkato Style</div>
                    <div className="text-sm text-muted-foreground">
                      Addis Ababa
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">Rejected</Badge>
                  </TableCell>
                  <TableCell className="text-right">ETB 35,000.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Adama Modern</div>
                    <div className="text-sm text-muted-foreground">
                      Adama
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Fulfilled</Badge>
                  </TableCell>
                  <TableCell className="text-right">ETB 45,000.00</TableCell>
                </TableRow>
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
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Men's Classic Tee</div>
                    <div className="text-sm text-muted-foreground">
                      #MCT-001
                    </div>
                  </TableCell>
                  <TableCell>
                    Men
                  </TableCell>
                  <TableCell className="text-right text-destructive font-semibold">5</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Women's Summer Dress</div>
                    <div className="text-sm text-muted-foreground">
                      #WSD-012
                    </div>
                  </TableCell>
                  <TableCell>
                    Women
                  </TableCell>
                  <TableCell className="text-right text-destructive font-semibold">8</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Kid's Graphic Hoodie</div>
                    <div className="text-sm text-muted-foreground">
                      #KGH-034
                    </div>
                  </TableCell>
                  <TableCell>
                    Kids
                  </TableCell>
                  <TableCell className="text-right font-semibold">22</TableCell>
                </TableRow>
                 <TableRow>
                  <TableCell>
                    <div className="font-medium">Unisex Denim Jacket</div>
                    <div className="text-sm text-muted-foreground">
                      #UDJ-007
                    </div>
                  </TableCell>
                  <TableCell>
                    Unisex
                  </TableCell>
                  <TableCell className="text-right text-destructive font-semibold">3</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
