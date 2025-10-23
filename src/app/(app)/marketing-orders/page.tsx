"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getMarketingOrders, createMarketingOrder, updateMarketingOrder, deleteMarketingOrder } from "@/lib/marketing-orders";
import { MarketingOrder, MarketingOrderItem, MarketingOrderStatus } from "@/lib/marketing-orders";
import Link from "next/link";
import { Eye, Edit, FileText, Trash2, X } from "lucide-react";
import { MarketingOrderDetailDialog } from "@/components/marketing-order-detail-dialog";
import { EditMarketingOrderDialog } from "@/components/edit-marketing-order-dialog";
import { generateOrderPDF, downloadPDF } from "@/lib/pdf-generator";
import Image from "next/image";

export default function MarketingOrdersPage() {
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [items, setItems] = useState<MarketingOrderItem[]>([]);

  // Item form state
  const [itemSize, setItemSize] = useState("");
  const [itemColor, setItemColor] = useState("");
  const [itemQuantity, setItemQuantity] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const fetchedOrders = await getMarketingOrders();
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      if (!productName || !productCode || quantity <= 0 || items.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields and add at least one item.",
          variant: "destructive",
        });
        return;
      }

      // Create Create the order data without the extra fields
      const orderData: any = {
        productName,
        productCode,
        description,
        quantity,
        status: "Placed Order" as MarketingOrderStatus,
        isCompleted: false,
        createdBy: "Marketing Team",
        items: items.map(item => ({
          size: item.size,
          color: item.color,
          quantity: item.quantity
        }))
      };

      // Add extra fields for new product registration if needed
      if (isNewProduct) {
        orderData.isNewProduct = true;
        orderData.category = category;
        orderData.price = price;
      }

      const newOrder = await createMarketingOrder(orderData);

      setOrders([newOrder, ...orders]);
      resetForm();
      setIsCreateDialogOpen(false);

      toast({
        title: "Success",
        description: "Marketing order created successfully.",
      });
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setProductName("");
    setProductCode("");
    setDescription("");
    setQuantity(0);
    setCategory("");
    setPrice(0);
    setIsNewProduct(false);
    setItems([]);
  };

  const addItem = () => {
    if (!itemSize || !itemColor || itemQuantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all item fields.",
        variant: "destructive",
      });
      return;
    }

    setItems([
      ...items,
      {
        orderId: "", // Will be set when creating the order
        size: itemSize,
        color: itemColor,
        quantity: itemQuantity
      }
    ]);

    // Reset item form
    setItemSize("");
    setItemColor("");
    setItemQuantity(0);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateOrderStatus = async (orderId: string, status: MarketingOrderStatus) => {
    try {
      const success = await updateMarketingOrder(orderId, { status });
      
      if (success) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
        
        toast({
          title: "Success",
          description: "Order status updated successfully.",
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

  const markAsCompleted = async (orderId: string) => {
    try {
      const success = await updateMarketingOrder(orderId, { 
        isCompleted: true,
        status: "Completed",
        completedDate: new Date().toISOString()
      });
      
      if (success) {
        setOrders(orders.map(order => 
          order.id === orderId ? { 
            ...order, 
            isCompleted: true,
            status: "Completed" as MarketingOrderStatus,
            completedDate: new Date().toISOString()
          } : order
        ));
        
        toast({
          title: "Success",
          description: "Order marked as completed. Factory inventory has been updated with produced quantities. Product is now available for shop orders.",
        });
      } else {
        throw new Error("Failed to mark order as completed");
      }
    } catch (error) {
      console.error("Error marking order as completed:", error);
      toast({
        title: "Error",
        description: "Failed to mark order as completed. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewOrder = (order: MarketingOrder) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  const handleEditOrder = (order: MarketingOrder) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this marketing order? This action cannot be undone.")) {
      return;
    }

    try {
      const success = await deleteMarketingOrder(orderId);
      
      if (success) {
        setOrders(orders.filter(order => order.id !== orderId));
        toast({
          title: "Success",
          description: "Marketing order deleted successfully.",
        });
      } else {
        throw new Error("Failed to delete marketing order");
      }
    } catch (error) {
      console.error("Error deleting marketing order:", error);
      toast({
        title: "Error",
        description: "Failed to delete marketing order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this marketing order?")) {
      return;
    }

    try {
      const success = await updateMarketingOrder(orderId, { 
        status: "Cancelled" as MarketingOrderStatus
      });
      
      if (success) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: "Cancelled" as MarketingOrderStatus } : order
        ));
        
        toast({
          title: "Success",
          description: "Marketing order cancelled successfully.",
        });
      } else {
        throw new Error("Failed to cancel marketing order");
      }
    } catch (error) {
      console.error("Error cancelling marketing order:", error);
      toast({
        title: "Error",
        description: "Failed to cancel marketing order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportToPdf = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast({
          title: "Error",
          description: "Order not found.",
          variant: "destructive",
        });
        return;
      }
      
      // Generate the PDF
      const pdfUrl = await generateOrderPDF(order);
      
      // Download the PDF
      downloadPDF(pdfUrl, `marketing-order-${order.orderNumber}.pdf`);
      
      toast({
        title: "Success",
        description: "PDF generated and downloaded successfully.",
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

  const handleUpdateOrder = (updatedOrder: MarketingOrder) => {
    setOrders(orders.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ));
    setSelectedOrder(updatedOrder);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Marketing Orders</h1>
        <div className="flex gap-2">
          <Button onClick={fetchOrders} variant="outline">
            Refresh
          </Button>
          <Button asChild>
            <Link href="/marketing-orders/new">Create New Order</Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Order Tracking</CardTitle>
          <CardDescription>
            Track the progress of marketing orders through production stages. Each order shows the product image for quick identification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Product Name & Code</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div>{order.productName}</div>
                    <div className="text-sm text-muted-foreground">{order.productCode}</div>
                  </TableCell>
                  <TableCell>
                    {order.imageUrl ? (
                      <div className="relative h-10 w-10 rounded-md overflow-hidden border">
                        <Image 
                          src={order.imageUrl} 
                          alt={order.productName} 
                          fill 
                          sizes="40px"
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">No Image</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      order.status === "Completed" 
                        ? "bg-green-100 text-green-800" 
                        : order.status === "Cancelled" as MarketingOrderStatus
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {order.status}
                    </div>
                    {order.isCompleted && (
                      <div className="text-xs text-green-600 mt-1">Ready for Shop Orders</div>
                    )}
                  </TableCell>
                  <TableCell>{order.createdBy}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!order.isCompleted && order.status !== "Cancelled" as MarketingOrderStatus && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, "Cutting" as MarketingOrderStatus)}
                          >
                            Cutting
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, "Production" as MarketingOrderStatus)}
                          >
                            Production
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, "Packing" as MarketingOrderStatus)}
                          >
                            Packing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateOrderStatus(order.id, "Delivery" as MarketingOrderStatus)}
                          >
                            Delivery
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => markAsCompleted(order.id)}
                          >
                            Complete
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={order.status === "Cancelled" as MarketingOrderStatus || order.isCompleted}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedOrder && (
        <>
          <MarketingOrderDetailDialog
            order={selectedOrder}
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onCancel={handleCancelOrder}
            onUpdateStatus={(orderId, status) => updateOrderStatus(orderId, status as MarketingOrderStatus)}
            onExportToPdf={handleExportToPdf}
          />
          <EditMarketingOrderDialog
            order={selectedOrder}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onUpdate={handleUpdateOrder}
          />
        </>
      )}
    </div>
  );
}