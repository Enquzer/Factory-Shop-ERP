

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrder } from "@/hooks/use-order";
import { Eye, Download, CreditCard, Truck, CheckCircle, Loader2 } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/orders";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
import { ordersStore } from "@/lib/orders";
import { createNotification } from "@/lib/notifications";


const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: 'default',
    'Awaiting Payment': 'secondary',
    Paid: 'outline',
    Dispatched: 'outline',
    Delivered: 'secondary',
    Cancelled: 'destructive'
};

const generateInvoicePDF = (order: Order) => {
    // const doc = new jsPDF();

    // doc.text(`Invoice for Order #${order.id}`, 14, 20);
    // doc.setFontSize(12);
    // doc.text(`Shop: ${order.shopName}`, 14, 30);
    // doc.text(`Date: ${order.date}`, 14, 36);

    // autoTable(doc, {
    //     startY: 45,
    //     head: [['Product', 'Variant', 'Qty', 'Unit Price', 'Total']],
    //     body: order.items.map(item => [
    //         item.name,
    //         `${item.variant.color}, ${item.variant.size}`,
    //         item.quantity,
    //         `ETB ${item.price.toFixed(2)}`,
    //         `ETB ${(item.price * item.quantity).toFixed(2)}`
    //     ]),
    // });

    // const finalY = (doc as any).lastAutoTable.finalY;
    // doc.setFontSize(14);
    // doc.text(`Total Amount: ETB ${order.amount.toFixed(2)}`, 14, finalY + 15);

    // doc.save(`invoice-${order.id}.pdf`);
}

const ShopActionButton = ({ order }: { order: Order }) => {
    const handleStatusChange = (order: Order, status: OrderStatus) => {
        ordersStore.updateOrderStatus(order.id, status);

        // Create notification for the factory
        createNotification({
            userType: 'factory',
            title: `Order Status Updated`,
            description: `Order #${order.id} from ${order.shopName} is now '${status}'`,
            href: '/orders',
        });
    }

    switch (order.status) {
        case 'Awaiting Payment':
            return (
                <Button size="sm" onClick={() => handleStatusChange(order, 'Paid')}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Mark as Paid
                </Button>
            );
        case 'Dispatched':
             return (
                <Button size="sm" onClick={() => handleStatusChange(order, 'Delivered')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Receipt
                </Button>
            );
        case 'Pending':
             return (
                <div className="flex items-center text-sm text-muted-foreground">
                   <Truck className="mr-2 h-4 w-4" /> Awaiting Confirmation
                </div>
            );
        default:
            return null;
    }
}


export default function ShopOrdersPage() {
    const { orders, isLoading } = useOrder();

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
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length > 0 ? (
                                    orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.id}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{order.date}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariants[order.status]}>{order.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-center space-x-2">
                                                <ShopActionButton order={order} />
                                                <Button variant="ghost" size="icon" onClick={() => generateInvoicePDF(order)} disabled>
                                                    <Download className="h-4 w-4" />
                                                    <span className="sr-only">Download Invoice</span>
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
