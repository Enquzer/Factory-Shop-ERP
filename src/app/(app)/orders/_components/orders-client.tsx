
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ordersStore, type Order, type OrderStatus } from "@/lib/orders";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createNotification } from "@/lib/notifications";
import { OrderDetailDialog } from "@/components/order-detail-dialog";

const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: 'default',
    'Awaiting Payment': 'secondary',
    Paid: 'outline',
    Dispatched: 'outline',
    Delivered: 'secondary',
    Cancelled: 'destructive'
};

const getFactoryActions = (status: OrderStatus): OrderStatus[] => {
    switch (status) {
        case 'Pending':
            return ['Awaiting Payment', 'Cancelled'];
        case 'Paid':
            return ['Dispatched'];
        default:
            return [];
    }
}


export function OrdersClientPage({ initialOrders }: { initialOrders: Order[] }) {
    const [allOrders, setAllOrders] = useState<Order[]>(initialOrders);
    const [isLoading, setIsLoading] = useState(initialOrders.length === 0);
    const [orderToView, setOrderToView] = useState<Order | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = ordersStore.subscribe(orders => {
            setAllOrders(orders);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatusChange = (order: Order, status: OrderStatus) => {
        ordersStore.updateOrderStatus(order.id, status);
        
        // Create notification for the shop
        createNotification({
            userType: 'shop',
            shopId: order.shopId,
            title: `Order Status Updated`,
            description: `Your order #${order.id} is now '${status}'`,
            href: '/shop/orders',
        });
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            {allOrders.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead className="hidden sm:table-cell">Shop Name</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allOrders.map((order) => {
                            const availableActions = getFactoryActions(order.status);
                            return (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                    {order.id}
                                    <div className="sm:hidden text-muted-foreground text-xs">{order.shopName}</div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{order.shopName}</TableCell>
                                <TableCell className="hidden md:table-cell">{order.date}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariants[order.status]}>{order.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Order Actions</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => setOrderToView(order)}>View Details</DropdownMenuItem>
                                            <DropdownMenuItem disabled>Edit Order</DropdownMenuItem>
                                            
                                            {availableActions.length > 0 && <DropdownMenuSeparator />}

                                            {availableActions.map(status => (
                                                <DropdownMenuItem
                                                    key={status}
                                                    onClick={() => handleStatusChange(order, status)}
                                                    disabled={order.status === status}
                                                >
                                                    {status === 'Awaiting Payment' ? 'Confirm Order' : `Mark as ${status}`}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No orders have been placed yet.</p>
                </div>
            )}
            
             {orderToView && (
                <OrderDetailDialog
                    order={orderToView}
                    open={!!orderToView}
                    onOpenChange={(isOpen) => !isOpen && setOrderToView(null)}
                />
            )}
        </>
    );
}
