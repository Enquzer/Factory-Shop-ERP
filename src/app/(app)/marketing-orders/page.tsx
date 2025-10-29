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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getMarketingOrders, createMarketingOrder, updateMarketingOrder, deleteMarketingOrder, getProcessStatusSummary } from "@/lib/marketing-orders";
import { MarketingOrder, MarketingOrderItem, MarketingOrderStatus } from "@/lib/marketing-orders";
import Link from "next/link";
import { Eye, Edit, FileText, Trash2, X, Calendar, Package, CheckCircle, TrendingUp, Scissors, Factory, Truck } from "lucide-react";
import { MarketingOrderDetailDialog } from "@/components/marketing-order-detail-dialog";
import { EditMarketingOrderDialog } from "@/components/edit-marketing-order-dialog";
import { generateOrderPDF, downloadPDF, generateSummaryReport } from "@/lib/pdf-generator";
import { GanttChart } from "@/components/gantt-chart";
import Image from "next/image";
import { MarketingOrdersDashboard } from "./_components/marketing-orders-dashboard";

export default function MarketingOrdersPage() {
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [producedQuantities, setProducedQuantities] = useState<Record<string, number>>({});
  const [processStatuses, setProcessStatuses] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state for new order
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [items, setItems] = useState<MarketingOrderItem[]>([]);
  const [orderPlacementDate, setOrderPlacementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState<string>("");

  // Item form state
  const [itemSize, setItemSize] = useState("");
  const [itemColor, setItemColor] = useState("");
  const [itemQuantity, setItemQuantity] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const [fetchedOrders, producedData] = await Promise.all([
        getMarketingOrders(),
        fetch('/api/marketing-orders/total-produced-all').then(res => res.json())
      ]);
      
      setOrders(fetchedOrders);
      setProducedQuantities(producedData.totals || {});
      
      // Fetch process status for each order
      const processStatusData: Record<string, any[]> = {};
      await Promise.all(fetchedOrders.map(async (order) => {
        const status = await getProcessStatusSummary(order.id);
        processStatusData[order.id] = status;
      }));
      
      setProcessStatuses(processStatusData);
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

      // Create the order data with new fields
      const orderData: any = {
        productName,
        productCode,
        description,
        quantity,
        status: "Placed Order" as MarketingOrderStatus,
        isCompleted: false,
        createdBy: "Marketing Team",
        orderPlacementDate,
        plannedDeliveryDate: plannedDeliveryDate || undefined,
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
    setOrderPlacementDate(new Date().toISOString().split('T')[0]);
    setPlannedDeliveryDate("");
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

  const openDeleteDialog = (orderId: string) => {
    setOrderToDelete(orderId);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setOrderToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const success = await deleteMarketingOrder(orderToDelete);
      
      if (success) {
        setOrders(orders.filter(order => order.id !== orderToDelete));
        toast({
          title: "Success",
          description: "Marketing order deleted successfully.",
        });
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
    } finally {
      closeDeleteDialog();
    }
  };

  const markAsCompleted = async (orderId: string) => {
    try {
      const success = await updateMarketingOrder(orderId, { 
        status: 'Completed' as MarketingOrderStatus, 
        isCompleted: true,
        completedDate: new Date().toISOString()
      });
      
      if (success) {
        setOrders(orders.map(order => 
          order.id === orderId ? { 
            ...order, 
            status: 'Completed' as MarketingOrderStatus, 
            isCompleted: true,
            completedDate: new Date().toISOString()
          } : order
        ));
        
        toast({
          title: "Success",
          description: "Order marked as completed.",
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

  const handleExportToPdf = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const pdfBlob = await generateOrderPDF(order);
      downloadPDF(pdfBlob, `${order.orderNumber}_details.pdf`);
      
      toast({
        title: "Success",
        description: "PDF exported successfully.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportSummaryToPdf = async () => {
    try {
      const pdfBlob = await generateSummaryReport(orders);
      downloadPDF(pdfBlob, 'marketing_orders_summary.pdf');
      
      toast({
        title: "Success",
        description: "Summary report exported successfully.",
      });
    } catch (error) {
      console.error("Error exporting summary report:", error);
      toast({
        title: "Error",
        description: "Failed to export summary report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to get process status display text
  const getProcessStatusText = (processStage: string, orderId: string) => {
    const statuses = processStatuses[orderId] || [];
    const process = statuses.find((p: any) => p.processStage === processStage);
    
    if (!process) return `${processStage}: Pending`;
    
    if (process.status === 'Completed') {
      return `${processStage}: Completed`;
    } else if (process.status === 'Partial') {
      return `${processStage}: Partial (${process.percentage}%)`;
    } else {
      return `${processStage}: Pending`;
    }
  };

  // Function to get process status color
  const getProcessStatusColor = (processStage: string, orderId: string) => {
    const statuses = processStatuses[orderId] || [];
    const process = statuses.find((p: any) => p.processStage === processStage);
    
    if (!process) return 'text-gray-500';
    
    if (process.status === 'Completed') {
      return 'text-green-600';
    } else if (process.status === 'Partial') {
      return 'text-yellow-600';
    } else {
      return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Marketing Orders</h1>
          <p className="text-muted-foreground">Manage your marketing orders.</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>Create New Order</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Marketing Order</DialogTitle>
              <DialogDescription>
                Fill in the details for your new marketing order.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productName" className="text-right">
                  Product Name
                </Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter product name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="productCode" className="text-right">
                  Product Code
                </Label>
                <Input
                  id="productCode"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter product code"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter order description"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Total Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity || ""}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="col-span-3"
                  placeholder="Enter total quantity"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="orderPlacementDate" className="text-right">
                  Order Placement Date
                </Label>
                <Input
                  id="orderPlacementDate"
                  type="date"
                  value={orderPlacementDate}
                  onChange={(e) => setOrderPlacementDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="plannedDeliveryDate" className="text-right">
                  Planned Delivery Date
                </Label>
                <Input
                  id="plannedDeliveryDate"
                  type="date"
                  value={plannedDeliveryDate}
                  onChange={(e) => setPlannedDeliveryDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isNewProduct" className="text-right">
                  New Product
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    id="isNewProduct"
                    type="checkbox"
                    checked={isNewProduct}
                    onChange={(e) => setIsNewProduct(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="isNewProduct">This is a new product</Label>
                </div>
              </div>
              
              {isNewProduct && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                      Category
                    </Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="col-span-3"
                      placeholder="Enter product category"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      Price
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={price || ""}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      className="col-span-3"
                      placeholder="Enter product price"
                    />
                  </div>
                </>
              )}
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Order Items</h3>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <Input
                    placeholder="Size"
                    value={itemSize}
                    onChange={(e) => setItemSize(e.target.value)}
                  />
                  <Input
                    placeholder="Color"
                    value={itemColor}
                    onChange={(e) => setItemColor(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Quantity"
                    value={itemQuantity || ""}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                  />
                  <Button onClick={addItem}>Add Item</Button>
                </div>
                {items.length > 0 && (
                  <div className="mt-2 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Size</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.size}</TableCell>
                            <TableCell>{item.color}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrder}>Create Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <MarketingOrdersDashboard orders={orders} producedQuantities={producedQuantities} />
        </TabsContent>
        
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Orders</CardTitle>
              <CardDescription>Manage your marketing orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Produced</TableHead>
                      <TableHead>Process Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const produced = producedQuantities[order.id] || 0;
                      const remaining = order.quantity - produced;
                      const progressPercentage = order.quantity > 0 ? Math.min(100, (produced / order.quantity) * 100) : 0;
                      const isFullyProduced = remaining <= 0;
                      
                      // Determine status display
                      let statusDisplay = order.status;
                      if (order.isCompleted) {
                        statusDisplay = 'Completed';
                      } else if (!isFullyProduced && order.status === 'Completed') {
                        // Fix incorrect status - order can't be completed if not fully produced
                        statusDisplay = 'Production';
                      }
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {order.imageUrl && (
                                <div className="relative h-10 w-10 rounded-md overflow-hidden">
                                  <Image
                                    src={order.imageUrl}
                                    alt={order.productName}
                                    fill
                                    className="object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/placeholder-product.png';
                                    }}
                                  />
                                </div>
                              )}
                              <div>
                                <div>{order.productName}</div>
                                <div className="text-sm text-muted-foreground">{order.productCode}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-blue-500" />
                              <span>{order.quantity}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{produced}</span>
                              </div>
                              {remaining > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {remaining} remaining
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className={`text-xs ${getProcessStatusColor('Cutting', order.id)}`}>
                                {getProcessStatusText('Cutting', order.id)}
                              </div>
                              <div className={`text-xs ${getProcessStatusColor('Production', order.id)}`}>
                                {getProcessStatusText('Production', order.id)}
                              </div>
                              <div className={`text-xs ${getProcessStatusColor('Packing', order.id)}`}>
                                {getProcessStatusText('Packing', order.id)}
                              </div>
                              <div className={`text-xs ${getProcessStatusColor('Delivery', order.id)}`}>
                                {getProcessStatusText('Delivery', order.id)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${
                                order.isCompleted ? 'bg-green-500' : 
                                order.status.toString() === 'Cancelled' ? 'bg-red-500' : 'bg-blue-500'
                              }`}></div>
                              <span>{statusDisplay}</span>
                              {order.quantity > 0 && (
                                <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ width: `${progressPercentage}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{order.createdBy}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportToPdf(order.id)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(order.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => markAsCompleted(order.id)}
                                disabled={order.status !== ('Delivery' as MarketingOrderStatus) || remaining > 0 || order.status === ('Placed Order' as MarketingOrderStatus)}
                                variant="outline"
                                size="sm"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No marketing orders found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          <GanttChart orders={orders} />
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Production Reports</CardTitle>
              <CardDescription>View and export production reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Summary Report</h3>
                    <p className="text-sm text-muted-foreground">Overview of all marketing orders</p>
                  </div>
                  <Button onClick={handleExportSummaryToPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the marketing order
              and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700">
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      {selectedOrder && (
        <MarketingOrderDetailDialog
          order={selectedOrder}
          open={isDetailDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedOrder(null);
            }
            setIsDetailDialogOpen(isOpen);
          }}
          onEdit={(order) => {
            setSelectedOrder(order);
            setIsEditDialogOpen(true);
            setIsDetailDialogOpen(false);
          }}
          onExportToPdf={handleExportToPdf}
          onUpdateStatus={updateOrderStatus}
          onDelete={openDeleteDialog}
          onCancel={markAsCompleted}
        />
      )}

      {/* Edit Dialog */}
      {selectedOrder && (
        <EditMarketingOrderDialog
          order={selectedOrder}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  );
}