import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";

const orders = [
    { id: "ORD-005", status: "Dispatched", amount: 1250.00, date: "2023-10-26", statusVariant: "outline" },
    { id: "ORD-006", status: "Pending", amount: 850.50, date: "2023-10-27", statusVariant: "default" },
    { id: "ORD-007", status: "Delivered", amount: 3200.00, date: "2023-10-22", statusVariant: "secondary" },
    { id: "ORD-004", status: "Processing", amount: 4500.00, date: "2023-10-20", statusVariant: "outline" },
    { id: "ORD-003", status: "Rejected", amount: 1500.00, date: "2023-10-18", statusVariant: "destructive" },
];

export default function ShopOrdersPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">My Orders</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>View and track all your past and current orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length > 0 ? (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.id}</TableCell>
                                        <TableCell>{order.date}</TableCell>
                                        <TableCell>
                                            <Badge variant={order.statusVariant as any}>{order.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <Eye className="h-4 w-4" />
                                                <span className="sr-only">View Details</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        You haven't placed any orders yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
