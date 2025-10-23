"use client";

import { useState, useEffect } from "react";
import { type Order } from "@/lib/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { OrderStatusFlow } from "@/components/order-status-flow";

export function OrderTracking() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/orders');
                if (response.ok) {
                    const ordersData = await response.json();
                    setOrders(ordersData);
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();

        // Set up polling to refresh orders periodically
        const intervalId = setInterval(fetchOrders, 30000); // Every 30 seconds

        return () => clearInterval(intervalId);
    }, []);

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Group orders by status
    const groupedOrders = orders.reduce((acc, order) => {
        if (!acc[order.status]) {
            acc[order.status] = [];
        }
        acc[order.status].push(order);
        return acc;
    }, {} as Record<string, Order[]>);

    const statusOrder = ['Pending', 'Awaiting Payment', 'Paid', 'Dispatched', 'Delivered', 'Cancelled'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statusOrder.map(status => (
                    <Card key={status}>
                        <CardHeader>
                            <CardTitle className="text-lg">{status}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {groupedOrders[status] ? (
                                    groupedOrders[status].map(order => (
                                        <div key={order.id} className="border rounded-lg p-4 hover:bg-muted cursor-pointer transition-colors"
                                            onClick={() => handleViewOrder(order)}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-medium">{order.id}</h3>
                                                    <p className="text-sm text-muted-foreground">{order.shopName}</p>
                                                </div>
                                                <p className="text-sm font-medium">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="mt-3">
                                                <OrderStatusFlow order={order} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-sm">No orders in this status</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {selectedOrder && (
                <OrderDetailDialog 
                    order={selectedOrder} 
                    open={isDialogOpen} 
                    onOpenChange={setIsDialogOpen} 
                />
            )}
        </div>
    );
}