"use client";

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { Order, OrderStatus } from "@/lib/orders";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { OrderStatusIndicator } from "@/app/(app)/orders/_components/order-status-indicator";

// Define the dispatch info type
type DispatchInfo = {
  shopName: string; // Changed from accountId to shopName
  transportLicensePlate: string;
  contactPerson: string;
  dispatchDate: string;
  driverName?: string;
};

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
            return ['Awaiting Payment'];
        case 'Awaiting Payment':
            return ['Paid'];
        case 'Paid':
            return ['Dispatched'];
        case 'Dispatched':
            return ['Delivered'];
        default:
            return [];
    }
}

export function OrdersClientPage({ initialOrders }: { initialOrders: Order[] }) {
    const [allOrders, setAllOrders] = useState<Order[]>(initialOrders);
    const [isLoading, setIsLoading] = useState(initialOrders.length === 0);
    const [orderToView, setOrderToView] = useState<Order | null>(null);
    const [dispatchInfo, setDispatchInfo] = useState<DispatchInfo | null>(null);
    const [showDispatchForm, setShowDispatchForm] = useState(false);
    const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null);
    const [shopData, setShopData] = useState<any>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/orders');
                if (response.ok) {
                    const orders = await response.json();
                    setAllOrders(orders);
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

    const handleStatusChange = async (order: Order, status: OrderStatus) => {
        try {
            // If changing to Dispatched, show dispatch form
            if (status === 'Dispatched') {
                setSelectedOrderForDispatch(order);
                
                // Fetch shop data to pre-populate dispatch form
                try {
                    // Use the shop ID to fetch shop data directly
                    const response = await fetch(`/api/shops?id=${order.shopId}`);
                    if (response.ok) {
                        const shop = await response.json();
                        setShopData(shop);
                        
                        // Pre-populate dispatch info with shop data
                        setDispatchInfo({
                            shopName: shop.name || order.shopName || '', // Use shop name from shop data or order
                            transportLicensePlate: '',
                            contactPerson: shop.contactPerson || '',
                            dispatchDate: new Date().toISOString().split('T')[0], // Auto-generate current date
                            driverName: ''
                        });
                    } else {
                        // Fallback to order data if API call fails
                        setDispatchInfo({
                            shopName: order.shopName || '',
                            transportLicensePlate: '',
                            contactPerson: '',
                            dispatchDate: new Date().toISOString().split('T')[0],
                            driverName: ''
                        });
                    }
                } catch (error) {
                    console.error("Error fetching shop data:", error);
                    // Set default values if shop data fetch fails
                    setDispatchInfo({
                        shopName: order.shopName || '',
                        transportLicensePlate: '',
                        contactPerson: '',
                        dispatchDate: new Date().toISOString().split('T')[0],
                        driverName: ''
                    });
                }
                
                setShowDispatchForm(true);
                return;
            }

            const response = await fetch(`/api/orders/${order.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                throw new Error('Failed to update order status');
            }

            // Refresh orders after status change
            const response2 = await fetch('/api/orders');
            if (response2.ok) {
                const orders = await response2.json();
                setAllOrders(orders);
            }

            // Note: Shop notifications are now handled by the API endpoint itself
            // We only need to refresh the UI
        } catch (error) {
            console.error("Error updating order status:", error);
        }
    }

    const handleDispatchSubmit = async () => {
        if (!selectedOrderForDispatch || !dispatchInfo) return;

        try {
            const response = await fetch(`/api/orders/${selectedOrderForDispatch.id}/dispatch`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ dispatchInfo }),
            });

            if (!response.ok) {
                throw new Error('Failed to add dispatch information');
            }

            // Refresh orders
            const response2 = await fetch('/api/orders');
            if (response2.ok) {
                const orders = await response2.json();
                setAllOrders(orders);
            }

            // Reset dispatch form
            setShowDispatchForm(false);
            setDispatchInfo(null);
            setSelectedOrderForDispatch(null);
            setShopData(null);
        } catch (error) {
            console.error("Error adding dispatch information:", error);
        }
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
            {/* Dispatch Form Modal */}
            {showDispatchForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Dispatch Information</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Shop Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2"
                                    value={dispatchInfo?.shopName || ''}
                                    onChange={(e) => setDispatchInfo({...dispatchInfo, shopName: e.target.value} as any)}
                                    placeholder="Enter shop name"
                                />
                                {shopData && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Auto-filled from shop registration: {shopData.name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Transport License Plate *</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2"
                                    value={dispatchInfo?.transportLicensePlate || ''}
                                    onChange={(e) => setDispatchInfo({...dispatchInfo, transportLicensePlate: e.target.value} as any)}
                                    placeholder="Enter transport license plate"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contact Person</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2"
                                    value={dispatchInfo?.contactPerson || ''}
                                    onChange={(e) => setDispatchInfo({...dispatchInfo, contactPerson: e.target.value} as any)}
                                    placeholder="Enter contact person"
                                />
                                {shopData && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Auto-filled from shop registration: {shopData.contactPerson}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Driver Name (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full border rounded p-2"
                                    value={dispatchInfo?.driverName || ''}
                                    onChange={(e) => setDispatchInfo({...dispatchInfo, driverName: e.target.value} as any)}
                                    placeholder="Enter driver name (optional)"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Dispatch Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded p-2"
                                    value={dispatchInfo?.dispatchDate || ''}
                                    onChange={(e) => setDispatchInfo({...dispatchInfo, dispatchDate: e.target.value} as any)}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Pre-filled with current date. You can change it if needed.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setShowDispatchForm(false)}>Cancel</Button>
                            <Button 
                                onClick={handleDispatchSubmit}
                                disabled={!dispatchInfo?.transportLicensePlate}
                            >
                                Submit
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {allOrders.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead className="hidden sm:table-cell">Shop Name</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden lg:table-cell">Progress</TableHead>
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
                                <TableCell className="hidden lg:table-cell">
                                    <OrderStatusIndicator status={order.status} />
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