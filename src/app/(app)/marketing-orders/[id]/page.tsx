"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getMarketingOrderById, updateMarketingOrder } from "@/lib/marketing-orders";
import { MarketingOrder, MarketingOrderStatus } from "@/lib/marketing-orders";
import { generateOrderPDF, downloadPDF } from "@/lib/pdf-generator";

export default function MarketingOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<MarketingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      const fetchedOrder = await getMarketingOrderById(params.id);
      setOrder(fetchedOrder);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast({
        title: "Error",
        description: "Failed to fetch order details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (status: MarketingOrderStatus) => {
    try {
      const success = await updateMarketingOrder(params.id, { status });
      
      if (success) {
        setOrder({ ...order, status } as MarketingOrder);
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

  const markAsCompleted = async () => {
    try {
      const success = await updateMarketingOrder(params.id, { 
        isCompleted: true,
        status: "Completed",
        completedDate: new Date().toISOString()
      });
      
      if (success) {
        setOrder({ 
          ...order, 
          isCompleted: true,
          status: "Completed" as MarketingOrderStatus,
          completedDate: new Date().toISOString()
        } as MarketingOrder);
        
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

  const generateAndDownloadPDF = async () => {
    try {
      if (!order) return;
      
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

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!order) {
    return <div className="flex items-center justify-center h-screen">Order not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Order Details</h1>
        <Button onClick={() => router.back()}>Back to Orders</Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
              <CardDescription>
                Details for order {order.orderNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Product Name</h3>
                  <p>{order.productName}</p>
                </div>
                <div>
                  <h3 className="font-medium">Product Code</h3>
                  <p>{order.productCode}</p>
                </div>
                <div>
                  <h3 className="font-medium">Total Quantity</h3>
                  <p>{order.quantity}</p>
                </div>
                <div>
                  <h3 className="font-medium">Status</h3>
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    order.status === "Completed" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {order.status}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Created By</h3>
                  <p>{order.createdBy}</p>
                </div>
                <div>
                  <h3 className="font-medium">Created At</h3>
                  <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                {order.completedDate && (
                  <div>
                    <h3 className="font-medium">Completed Date</h3>
                    <p>{new Date(order.completedDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              {order.description && (
                <div className="mt-4">
                  <h3 className="font-medium">Description</h3>
                  <p>{order.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Size and Color Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of quantities by size and color
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Actions</CardTitle>
              <CardDescription>
                Manage the production workflow for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!order.isCompleted && (
                  <>
                    <Button 
                      className="w-full" 
                      variant={order.status === "Cutting" ? "default" : "outline"}
                      onClick={() => updateOrderStatus("Cutting" as MarketingOrderStatus)}
                    >
                      Cutting
                    </Button>
                    <Button 
                      className="w-full" 
                      variant={order.status === "Production" ? "default" : "outline"}
                      onClick={() => updateOrderStatus("Production" as MarketingOrderStatus)}
                    >
                      Production
                    </Button>
                    <Button 
                      className="w-full" 
                      variant={order.status === "Packing" ? "default" : "outline"}
                      onClick={() => updateOrderStatus("Packing" as MarketingOrderStatus)}
                    >
                      Packing
                    </Button>
                    <Button 
                      className="w-full" 
                      variant={order.status === "Delivery" ? "default" : "outline"}
                      onClick={() => updateOrderStatus("Delivery" as MarketingOrderStatus)}
                    >
                      Delivery
                    </Button>
                    <Button 
                      className="w-full" 
                      onClick={markAsCompleted}
                    >
                      Mark as Completed
                    </Button>
                  </>
                )}
                
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={generateAndDownloadPDF}
                >
                  Generate & Download PDF
                </Button>
                
                {order.pdfUrl && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open(order.pdfUrl, "_blank")}
                  >
                    Download Previous PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Product Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Ready for Shop Orders</span>
                <div className={`h-3 w-3 rounded-full ${order.isCompleted ? "bg-green-500" : "bg-gray-300"}`}></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {order.isCompleted 
                  ? "This product is available for shop orders." 
                  : "This product is still in production and not available for shop orders."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}