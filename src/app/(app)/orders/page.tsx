import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const orders = [
    { id: "ORD-001", shopName: "Bole Boutique", date: "2023-11-01", status: "Dispatched", amount: 25000.00 },
    { id: "ORD-002", shopName: "Hawassa Habesha", date: "2023-10-28", status: "Awaiting Payment", amount: 15000.00 },
    { id: "ORD-003", shopName: "Merkato Style", date: "2023-10-25", status: "Rejected", amount: 35000.00 },
    { id: "ORD-004", shopName: "Adama Modern", date: "2023-10-22", status: "Fulfilled", amount: 45000.00 },
];


export default function OrdersPage() {
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
                     {orders.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead className="hidden sm:table-cell">Shop Name</TableHead>
                                    <TableHead className="hidden md:table-cell">Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            {order.id}
                                            <div className="sm:hidden text-muted-foreground text-xs">{order.shopName}</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{order.shopName}</TableCell>
                                        <TableCell className="hidden md:table-cell">{order.date}</TableCell>
                                        <TableCell>{order.status}</TableCell>
                                        <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No orders have been placed yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    