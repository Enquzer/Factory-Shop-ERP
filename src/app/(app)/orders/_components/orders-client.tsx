"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem, OrderStatus } from "@/lib/orders";
import { OrderStatusFlow } from "./order-status-flow";
import { OrderStatusIndicator } from "./order-status-indicator";
import { FileText, Search, Edit, Trash2, CheckCircle, XCircle, Truck, Package, Eye } from "lucide-react";
import Image from "next/image";
import { DispatchDialog } from "@/components/dispatch-dialog";
import { createAuthHeaders } from "@/lib/auth-helpers";
import { BulkSelectionTable } from "@/components/bulk-selection-table";
import { BulkActions } from "@/components/bulk-actions";
import { useAuth } from "@/contexts/auth-context";

export function OrdersClientPage({ initialOrders }: { initialOrders: Order[] }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [isOrderDetailsDialogOpen, setIsOrderDetailsDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let result = [...initialOrders];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(term) ||
        order.shopName.toLowerCase().includes(term) ||
        order.items.some(item => 
          item.name.toLowerCase().includes(term) ||
          (item.variant?.color || "").toLowerCase().includes(term) ||
          (item.variant?.size || "").toLowerCase().includes(term)
        )
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(order => order.status === statusFilter);
    }
    
    setFilteredOrders(result);
  }, [searchTerm, statusFilter, initialOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: string, isClosingOrder: boolean = false) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus as OrderStatus, isClosed: isClosingOrder } 
            : order
        ));
      
        toast({
          title: "Success",
          description: `Order status updated to ${newStatus}.`,
        });
      } else {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedOrder) return;
    
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders()
        },
        body: JSON.stringify({ feedback }),
      });

      if (response.ok) {
        setOrders(orders.map(order => 
          order.id === selectedOrder.id 
            ? { ...order, feedback } 
            : order
        ));
      
        toast({
          title: "Success",
          description: "Feedback submitted successfully.",
        });
      
        setIsFeedbackDialogOpen(false);
        setFeedback("");
        setSelectedOrder(null);
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'DELETE',
        headers: createAuthHeaders()
      });

      if (response.ok) {
        setOrders(orders.filter(order => order.id !== selectedOrder.id));
        setFilteredOrders(filteredOrders.filter(order => order.id !== selectedOrder.id));
      
        toast({
          title: "Success",
          description: "Order deleted successfully.",
        });
      
        setIsDeleteDialogOpen(false);
        setSelectedOrder(null);
      } else {
        throw new Error("Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusOptions = (currentStatus: string) => {
    const statusFlow: Record<string, string[]> = {
      "Pending": ["Awaiting Payment", "Cancelled"],
      "Awaiting Payment": ["Paid", "Cancelled"],
      "Paid": ["Released", "Cancelled"],
      "Released": ["Dispatched", "Cancelled"],
      "Dispatched": ["Delivered"],
      "Delivered": [],
      "Cancelled": []
    };
    
    return statusFlow[currentStatus] || [];
  };

  const handleDispatch = async (dispatchInfo: any) => {
    if (!selectedOrder) return;
    
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/dispatch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...createAuthHeaders()
        },
        body: JSON.stringify({ dispatchInfo }),
      });

      if (response.ok) {
        // Update the order status to 'Dispatched' in the local state
        setOrders(orders.map(order => 
          order.id === selectedOrder.id 
            ? { ...order, status: 'Dispatched', dispatchInfo } 
            : order
        ));
        
        toast({
          title: "Success",
          description: "Order dispatched successfully.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to dispatch order");
      }
    } catch (error: any) {
      console.error("Error dispatching order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to dispatch order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportOrderToPDF = async (orderId: string) => {
    try {
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = `/api/orders/${orderId}/pdf`;
      link.download = `shop-order-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Order PDF generated and downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (selectedIds: string[]) => {
    // For printing, we can open a new window with selected order details
    const selectedOrders = filteredOrders.filter(order => selectedIds.includes(order.id));
    
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
                  <th>Shop</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      selectedOrders.forEach(order => {
        printContent += `
          <tr>
            <td>${order.id}</td>
            <td>${order.shopName}</td>
            <td>${new Date(order.date).toLocaleDateString()}</td>
            <td>ETB ${order.amount.toLocaleString()}</td>
            <td>${order.status}</td>
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
  
  const handleBulkDelete = async (selectedIds: string[]) => {
    // Delete all selected orders
    for (const orderId of selectedIds) {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: 'DELETE',
          headers: createAuthHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete order ${orderId}`);
        }
      } catch (error) {
        console.error(`Error deleting order ${orderId}:`, error);
        toast({
          title: "Error",
          description: `Failed to delete order ${orderId}. Please try again.`,
          variant: "destructive",
        });
        return; // Stop if any deletion fails
      }
    }
    
    // Update the local state to remove deleted orders
    setOrders(orders.filter(order => !selectedIds.includes(order.id)));
    setFilteredOrders(filteredOrders.filter(order => !selectedIds.includes(order.id)));
    
    toast({
      title: "Success",
      description: `${selectedIds.length} order(s) deleted successfully.`,
    });
  };
  
  const handleExportToPDF = async () => {
    try {
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = '/api/orders/export';
      link.download = 'orders-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Orders report generated and downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 bg-background"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Awaiting Payment">Awaiting Payment</option>
          <option value="Paid">Paid</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        
        <Button onClick={handleExportToPDF} variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="rounded-md border">
        <BulkSelectionTable
          headers={[ 
            { key: 'id', title: 'Order ID', mobileTitle: 'ID' },
            { key: 'shopName', title: 'Shop', mobileTitle: 'Shop' },
            { key: 'date', title: 'Date', mobileTitle: 'Date' },
            { key: 'items', title: 'Items', mobileTitle: 'Items' },
            { key: 'amount', title: 'Amount', mobileTitle: 'Amount' },
            { key: 'status', title: 'Status', mobileTitle: 'Status' },
            { key: 'actions', title: 'Actions', mobileTitle: 'Actions' },
          ]}
          data={filteredOrders.map(order => ({
            ...order,
            date: new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
            items: (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="relative h-8 w-8 rounded-full border-2 border-background">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-product.png';
                          }}
                        />
                      ) : (
                        <div className="bg-muted rounded-full w-full h-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="relative h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium">+{order.items.length - 3}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">({order.items.length})</span>
              </div>
            ),
            amount: `ETB ${order.amount.toLocaleString()}`,
            status: <OrderStatusIndicator status={order.status} />,
            actions: (
              <div className="flex flex-wrap gap-2">
                {/* Only factory users can edit status */}
                {user?.role === 'factory' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsStatusDialogOpen(true);
                    }}
                    title="Update Order Status"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Update</span>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsOrderDetailsDialogOpen(true);
                  }}
                  title="View Order Details"
                >
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Details</span>
                </Button>
                
                {/* Dispatch button - only for Factory users on this view. Store users use their dedicated dashboard */}
                {user?.role === 'factory' && order.status === 'Paid' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDispatchDialogOpen(true);
                    }}
                    title="Dispatch Order"
                  >
                    <Truck className="h-4 w-4" />
                    <span className="sr-only">Dispatch</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportOrderToPDF(order.id)}
                  title="Export to PDF"
                >
                  <FileText className="h-4 w-4" />
                  <span className="sr-only">PDF</span>
                </Button>
                
                {/* Only factory users can delete */}
                {user?.role === 'factory' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDeleteDialogOpen(true);
                    }}
                    title="Delete Order"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            )
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
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No orders found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Update the status for order {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Current Status</h4>
                <OrderStatusIndicator status={selectedOrder.status} />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Available Statuses</h4>
                <div className="flex flex-col gap-3">
                  {getStatusOptions(selectedOrder.status).map((status) => (
                    <div key={status} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{status}</span>
                        <span className="text-xs text-muted-foreground">
                          {status === 'Awaiting Payment' ? '(Factory Action)' : 
                           status === 'Paid' ? '(Finance Action)' : 
                           status === 'Released' ? '(Finance/Store Action)' : 
                           status === 'Dispatched' ? '(Store Action)' : 
                           status === 'Delivered' ? '(Shop Action)' : 
                           status === 'Cancelled' ? '(Manual Override)' : ''}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleStatusUpdate(selectedOrder.id, status);
                          setIsStatusDialogOpen(false);
                        }}
                      >
                        Set to {status}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="close-order"
                  checked={isClosing}
                  onChange={(e) => setIsClosing(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="close-order">Mark as closed</Label>
              </div>
              
              {isClosing && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleStatusUpdate(selectedOrder.id, "Cancelled", true);
                    setIsStatusDialogOpen(false);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Order
                </Button>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <DispatchDialog 
        order={selectedOrder}
        open={isDispatchDialogOpen}
        onOpenChange={setIsDispatchDialogOpen}
        onDispatch={handleDispatch}
      />

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Feedback</DialogTitle>
            <DialogDescription>
              View or add feedback for order {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={selectedOrder.feedback || feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback for this order..."
                  rows={4}
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 border rounded">
                      {item.imageUrl ? (
                        <div className="relative h-12 w-12 rounded-md overflow-hidden">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-product.png';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="bg-muted rounded-md w-12 h-12 flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.variant?.color || "N/A"}, {item.variant?.size || "N/A"} × {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleFeedbackSubmit}>
              Save Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order {selectedOrder?.id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrder}>
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={isOrderDetailsDialogOpen} onOpenChange={setIsOrderDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Full details and status for order {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Order ID</div>
                    <div className="font-medium">{selectedOrder.id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Order Date</div>
                    <div className="font-medium">{new Date(selectedOrder.date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Shop Name</div>
                    <div className="font-medium">{selectedOrder.shopName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium">
                      <OrderStatusIndicator status={selectedOrder.status} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="font-medium">ETB {selectedOrder.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Is Closed</div>
                    <div className="font-medium">{selectedOrder.isClosed ? 'Yes' : 'No'}</div>
                  </div>
                  {selectedOrder.feedback && (
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Feedback</div>
                      <div className="font-medium p-3 bg-muted rounded-md">{selectedOrder.feedback}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Product</th>
                          <th className="text-left py-2 px-4">Variant</th>
                          <th className="text-right py-2 px-4">Quantity</th>
                          <th className="text-right py-2 px-4">Unit Price</th>
                          <th className="text-right py-2 px-4">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-3">
                                {item.imageUrl ? (
                                  <div className="relative h-12 w-12 rounded-md overflow-hidden">
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.name}
                                      fill
                                      className="object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-product.png';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="bg-muted rounded-md w-12 h-12 flex items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-sm text-muted-foreground">{item.productId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <div>{item.variant?.color || "N/A"}, {item.variant?.size || "N/A"}</div>
                            </td>
                            <td className="py-2 px-4 text-right">{item.quantity}</td>
                            <td className="py-2 px-4 text-right">ETB {item.price.toLocaleString()}</td>
                            <td className="py-2 px-4 text-right">ETB {(item.quantity * item.price).toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={4} className="py-2 px-4 text-right font-medium">Total</td>
                          <td className="py-2 px-4 text-right font-bold">ETB {selectedOrder.amount.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              
              {/* Dispatch Information */}
              {selectedOrder.dispatchInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle>Dispatch Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Shop Name</div>
                      <div className="font-medium">{selectedOrder.dispatchInfo.shopName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Transport License Plate</div>
                      <div className="font-medium">{selectedOrder.dispatchInfo.transportLicensePlate}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Contact Person</div>
                      <div className="font-medium">{selectedOrder.dispatchInfo.contactPerson}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Dispatch Date</div>
                      <div className="font-medium">{new Date(selectedOrder.dispatchInfo.dispatchDate).toLocaleDateString()}</div>
                    </div>
                    {selectedOrder.dispatchInfo.driverName && (
                      <div>
                        <div className="text-sm text-muted-foreground">Driver Name</div>
                        <div className="font-medium">{selectedOrder.dispatchInfo.driverName}</div>
                      </div>
                    )}
                    {selectedOrder.dispatchInfo.attachments && selectedOrder.dispatchInfo.attachments.length > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground">Attachments</div>
                        <div className="font-medium">
                          {selectedOrder.dispatchInfo.attachments.map((attachment, index) => (
                            <div key={index} className="text-sm">{attachment}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Status History */}
              <Card>
                <CardHeader>
                  <CardTitle>Status History</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderStatusFlow order={selectedOrder} />
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}