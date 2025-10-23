"use client";

import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrder } from "@/hooks/use-order";
import { useAuth } from '@/contexts/auth-context';
import { type Shop } from "@/lib/shops";
import { type Order, type OrderStatus } from "@/lib/orders";
import { Loader2, Upload, X } from "lucide-react";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { OrderStatusIndicator } from "@/app/(app)/orders/_components/order-status-indicator";

export default function ShopOrdersPage() {
    const { orders, isLoading } = useOrder();
    const { user } = useAuth();
    const [shop, setShop] = useState<Shop|null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [paymentSlipFile, setPaymentSlipFile] = useState<File | null>(null);
    const [paymentSlipPreview, setPaymentSlipPreview] = useState<string | null>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isClosed, setIsClosed] = useState(false);
    const [showDeliveryForm, setShowDeliveryForm] = useState(false);
    const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchShop = async () => {
            // Use API with username instead of shop ID
            try {
                const response = await fetch(`/api/shops/${user?.username}`);
                if (response.ok) {
                    const shopData = await response.json();
                    setShop(shopData);
                }
            } catch (error) {
                console.error('Error fetching shop:', error);
            }
        }
        if (user?.username) {
            fetchShop();
        }
    }, [user?.username]);

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsDialogOpen(true);
    };

    const handleConfirmPayment = (order: Order) => {
        setSelectedOrderForPayment(order);
        setPaymentSlipFile(null);
        setPaymentSlipPreview(null);
        setShowPaymentForm(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPaymentSlipFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentSlipPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePaymentSlip = () => {
        setPaymentSlipFile(null);
        setPaymentSlipPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handlePaymentSubmit = async () => {
        if (!selectedOrderForPayment || !paymentSlipFile) return;

        try {
            // First, upload the file
            const formData = new FormData();
            formData.append('file', paymentSlipFile);
            formData.append('filename', `payment-slip-${selectedOrderForPayment.id}-${Date.now()}.${paymentSlipFile.name.split('.').pop()}`);
            
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload payment slip');
            }

            const { imageUrl } = await uploadResponse.json();

            // Then, confirm payment with the image URL
            const response = await fetch(`/api/orders/${selectedOrderForPayment.id}/payment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ paymentSlipUrl: imageUrl }),
            });

            if (!response.ok) {
                throw new Error('Failed to confirm payment');
            }

            // Refresh orders
            window.location.reload();
        } catch (error) {
            console.error("Error confirming payment:", error);
        }
    };

    const handleConfirmDelivery = (order: Order) => {
        setSelectedOrderForDelivery(order);
        setDeliveryDate(new Date().toISOString().split('T')[0]); // Default to today
        setShowDeliveryForm(true);
    };

    const handleDeliverySubmit = async () => {
        if (!selectedOrderForDelivery || !deliveryDate) return;

        try {
            const response = await fetch(`/api/orders/${selectedOrderForDelivery.id}/delivery`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ deliveryDate, isClosed, feedback }),
            });

            if (!response.ok) {
                throw new Error('Failed to confirm delivery');
            }

            // Refresh orders
            window.location.reload();
        } catch (error) {
            console.error("Error confirming delivery:", error);
        }
    };

    const getShopActions = (order: Order) => {
        switch (order.status) {
            case 'Awaiting Payment':
                return (
                    <Button variant="outline" size="sm" onClick={() => handleConfirmPayment(order)}>
                        Confirm Payment
                    </Button>
                );
            case 'Dispatched':
                return (
                    <Button variant="outline" size="sm" onClick={() => handleConfirmDelivery(order)}>
                        Confirm Delivery
                    </Button>
                );
            default:
                return (
                    <Button variant="outline" size="sm" onClick={() => handleViewOrder(order)}>
                        View
                    </Button>
                );
        }
    };

    const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
        Pending: 'default',
        'Awaiting Payment': 'secondary',
        Paid: 'outline',
        Dispatched: 'outline',
        Delivered: 'secondary',
        Cancelled: 'destructive'
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Payment Form Modal */}
            {showPaymentForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Confirm Payment</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Payment Slip</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                {!paymentSlipPreview ? (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="w-full"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Payment Slip
                                    </Button>
                                ) : (
                                    <div className="relative">
                                        <img 
                                            src={paymentSlipPreview} 
                                            alt="Payment slip preview" 
                                            className="w-full h-48 object-contain border rounded"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                                            onClick={removePaymentSlip}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                                {paymentSlipFile && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {paymentSlipFile.name} ({(paymentSlipFile.size / 1024).toFixed(2)} KB)
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                            <Button 
                                onClick={handlePaymentSubmit}
                                disabled={!paymentSlipFile}
                            >
                                Submit
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delivery Form Modal */}
            {showDeliveryForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Confirm Delivery</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Delivery Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded p-2"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Feedback (Optional)</label>
                                <textarea
                                    className="w-full border rounded p-2"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Enter any feedback about the delivery"
                                    rows={3}
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isClosed"
                                    checked={isClosed}
                                    onChange={(e) => setIsClosed(e.target.checked)}
                                    className="mr-2"
                                />
                                <label htmlFor="isClosed">Close this order</label>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button variant="outline" onClick={() => setShowDeliveryForm(false)}>Cancel</Button>
                            <Button onClick={handleDeliverySubmit}>Submit</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">My Orders</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>View and track all your past and current orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading || !shop ? (
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
                                    <TableHead className="hidden lg:table-cell">Progress</TableHead>
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
                                            <TableCell className="hidden lg:table-cell">
                                                <OrderStatusIndicator status={order.status} />
                                            </TableCell>
                                            <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-center">
                                                {getShopActions(order)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            You haven't placed any orders yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            
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