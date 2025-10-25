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
import { getMarketingOrders, createMarketingOrder, updateMarketingOrder, deleteMarketingOrder } from "@/lib/marketing-orders";
import { MarketingOrder, MarketingOrderItem, MarketingOrderStatus } from "@/lib/marketing-orders";
import Link from "next/link";
import { Eye, Edit, FileText, Trash2, X, Calendar, Package, CheckCircle } from "lucide-react";
import { MarketingOrderDetailDialog } from "@/components/marketing-order-detail-dialog";
import { EditMarketingOrderDialog } from "@/components/edit-marketing-order-dialog";
import { generateOrderPDF, downloadPDF, generateSummaryReport } from "@/lib/pdf-generator";
import { GanttChart } from "@/components/gantt-chart";
import Image from "next/image";
import { MarketingOrdersDashboard } from "./_components/marketing-orders-dashboard";

export default function MarketingOrdersPage() {
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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

  const markAsCompleted = async (orderId: string) => {
    try {
      const success = await updateMarketingOrder(orderId, { 
        isCompleted: true,
        status: "Completed",
        completedDate: new Date().toISOString()
      });
      
      if (success) {
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                isCompleted: true,
                status: "Completed" as MarketingOrderStatus,
                completedDate: new Date().toISOString()
              } 
            : order
        ));
        
        toast({
          title: "Success",
          description: "Order marked as completed. Product is now available for shop orders.",
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

  const handleDeleteOrder = async (orderId: string) => {
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

  const handleExportSummaryToPdf = async () => {
    try {
      // Generate the summary report PDF
      const pdfUrl = await generateSummaryReport(orders);
      
      // Download the PDF
      downloadPDF(pdfUrl, "marketing-orders-summary.pdf");
      
      toast({
        title: "Success",
        description: "Summary report generated and downloaded successfully.",
      });
    } catch (error) {
      console.error("Error generating summary PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate summary report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Marketing Orders</h1>
        <div className="flex gap-2">
          <Button onClick={fetchOrders} variant="outline">
            Refresh
          </Button>
          <Button onClick={handleExportSummaryToPdf} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export Summary
          </Button>
          <Button asChild>
            <Link href="/marketing-orders/new">Create New Order</Link>
          </Button>
        </div>
      </div>
      
      <MarketingOrdersDashboard orders={orders} />

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="timeline">Production Timeline</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order List</CardTitle>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
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
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${
                              order.isCompleted ? 'bg-green-500' : 
                              order.status.toString() === 'Cancelled' ? 'bg-red-500' : 'bg-blue-500'
                            }`}></div>
                            <span>{order.isCompleted ? 'Completed' : order.status}</span>
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
          onDelete={handleDeleteOrder}
          onCancel={(orderId) => updateOrderStatus(orderId, 'Cancelled' as MarketingOrderStatus)}
        />
      )}

      {/* Edit Dialog */}
      {selectedOrder && (
        <EditMarketingOrderDialog
          order={selectedOrder}
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedOrder(null);
            }
            setIsEditDialogOpen(isOpen);
          }}
          onUpdate={(updatedOrder: MarketingOrder) => {
            setOrders(orders.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            ));
            setSelectedOrder(updatedOrder);
          }}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Marketing Order</DialogTitle>
            <DialogDescription>
              Fill in the details for the new marketing order.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="productCode">Product Code *</Label>
                <Input
                  id="productCode"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="Enter product code"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter product description"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <Label htmlFor="orderPlacementDate">Order Placement Date</Label>
                <Input
                  id="orderPlacementDate"
                  type="date"
                  value={orderPlacementDate}
                  onChange={(e) => setOrderPlacementDate(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="plannedDeliveryDate">Planned Delivery Date</Label>
              <Input
                id="plannedDeliveryDate"
                type="date"
                value={plannedDeliveryDate}
                onChange={(e) => setPlannedDeliveryDate(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isNewProduct"
                checked={isNewProduct}
                onChange={(e) => setIsNewProduct(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isNewProduct">This is a new product</Label>
            </div>
            
            {isNewProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Enter category"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price || ''}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Enter price"
                  />
                </div>
              </div>
            )}
            
            <div>
              <Label>Items *</Label>
              <div className="space-y-2 mt-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.size}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].size = e.target.value;
                        setItems(newItems);
                      }}
                      placeholder="Size"
                    />
                    <Input
                      value={item.color}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].color = e.target.value;
                        setItems(newItems);
                      }}
                      placeholder="Color"
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].quantity = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }}
                      placeholder="Quantity"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <Input
                  value={itemSize}
                  onChange={(e) => setItemSize(e.target.value)}
                  placeholder="Size"
                />
                <Input
                  value={itemColor}
                  onChange={(e) => setItemColor(e.target.value)}
                  placeholder="Color"
                />
                <Input
                  type="number"
                  value={itemQuantity || ''}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Quantity"
                />
              </div>
              
              <Button
                variant="outline"
                className="mt-2"
                onClick={addItem}
              >
                Add Item
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}