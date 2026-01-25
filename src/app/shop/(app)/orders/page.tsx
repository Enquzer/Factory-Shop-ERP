"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOrder } from "@/hooks/use-order";
import { useAuth } from '@/contexts/auth-context';
import { type Shop } from "@/lib/shops";
import { type Order, type OrderStatus } from "@/lib/orders";
import { Loader2, Upload, X, FileText, Search, CalendarIcon } from "lucide-react";
import { OrderDetailDialog } from "@/components/order-detail-dialog";
import { OrderStatusIndicator } from "@/app/(app)/orders/_components/order-status-indicator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { createAuthHeaders } from "@/lib/auth-helpers";
import { BulkSelectionTable } from "@/components/bulk-selection-table";
import { BulkActions } from "@/components/bulk-actions";

export default function ShopOrdersPage() {
    const { orders, isLoading, refreshOrders } = useOrder();
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
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    
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

    // Filter orders based on search criteria
    const filteredOrders = useMemo(() => {
        let result = [...orders];
        
        // Filter by search term (order ID)
        if (searchTerm) {
            result = result.filter(order => 
                order.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Filter by status
        if (statusFilter !== 'All') {
            result = result.filter(order => order.status === statusFilter);
        }
        
        // Filter by date range
        if (dateRange?.from || dateRange?.to) {
            result = result.filter(order => {
                const orderDate = new Date(order.date);
                return (
                    (!dateRange.from || orderDate >= dateRange.from) &&
                    (!dateRange.to || orderDate <= dateRange.to)
                );
            });
        }
        
        return result;
    }, [orders, searchTerm, statusFilter, dateRange]);

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsDialogOpen(true);
    };

    const handleDownloadOrderPDF = async (orderId: string) => {
        try {
            // Create a temporary link to download the PDF
            const link = document.createElement('a');
            link.href = `/api/orders/${orderId}/pdf`;
            link.download = `shop-order-${orderId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error generating PDF:", error);
            // In a real implementation, you would show a toast notification
            alert("Failed to generate PDF. Please try again.");
        }
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
                headers: {
                    ...createAuthHeaders()
                },
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload payment slip');
            }

            const { url } = await uploadResponse.json();

            // Then, confirm payment with the URL
            const response = await fetch(`/api/orders/${selectedOrderForPayment.id}/payment`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...createAuthHeaders()
                },
                body: JSON.stringify({ paymentSlipUrl: url }),
            });

            if (!response.ok) {
                throw new Error('Failed to confirm payment');
            }

            // Close the payment form
            setShowPaymentForm(false);
            // Reset form state
            setSelectedOrderForPayment(null);
            setPaymentSlipFile(null);
            setPaymentSlipPreview(null);
            
            // Refresh orders using the hook function
            if (refreshOrders) {
                await refreshOrders();
            }
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
                    ...createAuthHeaders()
                },
                body: JSON.stringify({ deliveryDate, isClosed, feedback }),
            });

            if (!response.ok) {
                throw new Error('Failed to confirm delivery');
            }

            // Close the delivery form
            setShowDeliveryForm(false);
            // Reset form state
            setSelectedOrderForDelivery(null);
            setDeliveryDate('');
            setIsClosed(false);
            setFeedback('');
            
            // Refresh orders using the hook function
            if (refreshOrders) {
                await refreshOrders();
            }
        } catch (error) {
            console.error("Error confirming delivery:", error);
        }
    };

    const getShopActions = (order: Order) => {
        // Determine if order is in a closed or final state
        const isOrderClosed = order.isClosed || 
                             order.status === 'Delivered' || 
                             order.status === 'Cancelled';
        
        return (
            <div className="flex gap-2">
                <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewOrder(order)}
                >
                    View
                </Button>
                <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownloadOrderPDF(order.id)}
                >
                    <FileText className="h-4 w-4" />
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleConfirmPayment(order)}
                    disabled={isOrderClosed || (order.status !== 'Awaiting Payment' && order.status !== 'Pending' && order.status !== 'Payment Slip Attached')}
                >
                    Confirm Payment
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleConfirmDelivery(order)}
                    disabled={isOrderClosed || order.status !== 'Dispatched'}
                >
                    Confirm Delivery
                </Button>
            </div>
        );
    };

    const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
        Pending: 'default',
        'Awaiting Payment': 'secondary',
        'Payment Slip Attached': 'outline',
        Paid: 'outline',
        Released: 'outline',
        Dispatched: 'outline',
        Delivered: 'secondary',
        Cancelled: 'destructive'
    };

    const handleDialogOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        // Only reset selectedOrder when closing the dialog
        if (!open) {
            // Use setTimeout to ensure state updates don't cause re-renders
            setTimeout(() => {
                setSelectedOrder(null);
            }, 0);
        }
    };

    const handlePrint = (selectedIds: string[]) => {
        // For printing, we can open a new window with selected order details
        const selectedOrders = orders.filter(order => selectedIds.includes(order.id));
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          let printContent = `
            <html>
              <head>
                <title>Selected Orders</title>
                <style>
                  body { font-family: Arial, sans-serif; }
                  table { border-collapse: collapse; width: 100%; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f2f2f2; }
                </style>
              </head>
              <body>
                <h1>Selected Orders (${selectedOrders.length})</h1>
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
          `;
          
          selectedOrders.forEach(order => {
            printContent += `
              <tr>
                <td>${order.id}</td>
                <td>${order.date}</td>
                <td>${order.status}</td>
                <td>ETB ${order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `;
          });
          
          printContent += `
                  </tbody>
                </table>
              </body>
            </html>
          `;
          
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
    };
    
    const handleBulkDelete = (selectedIds: string[]) => {
        // For shop users, we can only delete unpublished orders
        // In this case, we'll show a message since shop users typically can't delete orders
        alert(`Bulk delete requested for orders: ${selectedIds.join(', ')}.\n\nNote: Shop users typically cannot delete orders that are already processed.`);
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
                                    accept="image/*,application/pdf"
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
                                        {paymentSlipFile?.type === 'application/pdf' ? (
                                            <div className="w-full h-48 flex flex-col items-center justify-center border rounded bg-muted/30">
                                                <FileText className="h-16 w-16 text-primary mb-2" />
                                                <span className="text-sm font-medium text-center px-4 truncate w-full">
                                                    {paymentSlipFile.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    PDF Document
                                                </span>
                                            </div>
                                        ) : (
                                            <img 
                                                src={paymentSlipPreview} 
                                                alt="Payment slip preview" 
                                                className="w-full h-48 object-contain border rounded"
                                            />
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow-md"
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
            
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by Order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Awaiting Payment">Awaiting Payment</SelectItem>
                        <SelectItem value="Payment Slip Attached">Payment Slip Attached</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Dispatched">Dispatched</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
                
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full md:w-48 justify-start text-left font-normal",
                                !dateRange?.from && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange?.to ? (
                                    <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Date Range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
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
                        <BulkSelectionTable
                            headers={[ 
                                { key: 'orderId', title: 'Order ID', mobileTitle: 'Order' },
                                { key: 'date', title: 'Date', mobileTitle: 'Date', className: 'hidden sm:table-cell' },
                                { key: 'status', title: 'Status', mobileTitle: 'Status' },
                                { key: 'progress', title: 'Progress', mobileTitle: 'Progress', className: 'hidden lg:table-cell' },
                                { key: 'amount', title: 'Amount', mobileTitle: 'Amount', className: 'text-right' },
                                { key: 'actions', title: 'Actions', mobileTitle: 'Actions', className: 'text-center' },
                            ]}
                            data={filteredOrders.map((order) => ({
                                id: order.id,
                                orderId: (
                                    <div className="font-medium">{order.id}</div>
                                ),
                                date: (
                                    <div className="text-sm">{order.date}</div>
                                ),
                                status: (
                                    <Badge variant={statusVariants[order.status]}>{order.status}</Badge>
                                ),
                                progress: (
                                    <OrderStatusIndicator status={order.status} />
                                ),
                                amount: (
                                    <div className="text-right">
                                        ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                ),
                                actions: (
                                    <div className="text-center">
                                        {getShopActions(order)}
                                    </div>
                                ),
                            }))}
                            idKey="id"
                            actions={
                                <BulkActions 
                                    onPrint={handlePrint}
                                    onDelete={handleBulkDelete}
                                    printLabel="Print Selected"
                                    deleteLabel="Delete Selected"
                                    itemType="orders"
                                />
                            }
                        />
                    )}
                </CardContent>
            </Card>
            
            {selectedOrder && (
                <OrderDetailDialog 
                    order={selectedOrder} 
                    open={isDialogOpen} 
                    onOpenChange={handleDialogOpenChange} 
                />
            )}
        </div>
    );
}