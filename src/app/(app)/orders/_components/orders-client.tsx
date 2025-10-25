"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem, OrderStatus } from "@/lib/orders";
import { OrderStatusFlow } from "./order-status-flow";
import { OrderStatusIndicator } from "./order-status-indicator";
import { FileText, Search, Edit, Trash2, CheckCircle, XCircle, Truck, Package, Eye } from "lucide-react";
import Image from "next/image";

export function OrdersClientPage({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
          item.variant.color.toLowerCase().includes(term) ||
          item.variant.size.toLowerCase().includes(term)
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
      "Paid": ["Dispatched"],
      "Dispatched": ["Delivered"],
      "Delivered": [],
      "Cancelled": []
    };
    
    return statusFlow[currentStatus] || [];
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.shopName}</TableCell>
                <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>ETB {order.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <OrderStatusIndicator status={order.status} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsStatusDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsFeedbackDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
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
                <div className="flex flex-wrap gap-2">
                  {getStatusOptions(selectedOrder.status).map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      onClick={() => {
                        handleStatusUpdate(selectedOrder.id, status);
                        setIsStatusDialogOpen(false);
                      }}
                    >
                      {status}
                    </Button>
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
                          {item.variant.color}, {item.variant.size} × {item.quantity}
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
    </div>
  );
}