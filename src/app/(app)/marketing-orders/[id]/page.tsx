"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getMarketingOrderById, updateMarketingOrder } from "@/lib/marketing-orders";
import { getReceivingVouchersByOrder } from "@/lib/receiving-vouchers";
import { MarketingOrder, MarketingOrderStatus } from "@/lib/marketing-orders";
import { generateOrderPDF, downloadPDF } from "@/lib/pdf-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionTracking } from "@/components/marketing-orders/production-tracking";
import { Receipt } from "lucide-react";

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
      const pdfUrl = await generateOrderPDF(order);
      downloadPDF(pdfUrl, `marketing-order-${order.orderNumber}.pdf`);
      toast({ title: "Success", description: "PDF generated and downloaded successfully." });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!order) return <div className="flex items-center justify-center h-screen">Order not found</div>;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Order Details</h1>
        <Button onClick={() => router.back()}>Back to Orders</Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tracking">Production Tracking</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Order Information</CardTitle>
                  <CardDescription>Details for order {order.orderNumber}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><h3 className="font-medium">Product Name</h3><p>{order.productName}</p></div>
                    <div><h3 className="font-medium">Product Code</h3><p>{order.productCode}</p></div>
                    <div><h3 className="font-medium">Total Quantity</h3><p>{order.quantity}</p></div>
                    <div>
                      <h3 className="font-medium">Status</h3>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        order.status === "Completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                      }`}>{order.status}</div>
                    </div>
                    <div><h3 className="font-medium">Created By</h3><p>{order.createdBy}</p></div>
                    <div><h3 className="font-medium">Created At</h3><p>{new Date(order.createdAt).toLocaleDateString()}</p></div>
                  </div>
                  {order.description && <div className="mt-4"><h3 className="font-medium">Description</h3><p>{order.description}</p></div>}
                </CardContent>
              </Card>
              
              {order.receivingVoucherPadNumber && (
                <Card className="mt-6 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Receipt className="h-5 w-5" />
                      Receiving Voucher
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-green-700">Finished goods receiving voucher pad number:</p>
                      <p className="text-lg font-mono font-bold text-green-900 bg-white p-2 rounded border">
                        {order.receivingVoucherPadNumber}
                      </p>
                      <p className="text-xs text-green-600">
                        Generated automatically when production was completed and goods were received to store
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Size and Color Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Size</TableHead><TableHead>Color</TableHead><TableHead>Quantity</TableHead></TableRow>
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!order.isCompleted && (
                      <>
                        <Button className="w-full" variant={order.status === "Cutting" ? "default" : "outline"} onClick={() => updateOrderStatus("Cutting" as MarketingOrderStatus)}>Cutting</Button>
                        <Button className="w-full" variant={order.status === "Sewing" ? "default" : "outline"} onClick={() => updateOrderStatus("Sewing" as MarketingOrderStatus)}>Sewing (Production)</Button>
                        <Button className="w-full" variant={order.status === "Packing" ? "default" : "outline"} onClick={() => updateOrderStatus("Packing" as MarketingOrderStatus)}>Packing</Button>
                        <Button className="w-full" variant={order.status === "Delivery" ? "default" : "outline"} onClick={() => updateOrderStatus("Delivery" as MarketingOrderStatus)}>Delivery</Button>
                        <Button className="w-full" onClick={markAsCompleted}>Mark as Completed</Button>
                      </>
                    )}
                    <Button className="w-full" variant="secondary" onClick={generateAndDownloadPDF}>Generate & Download PDF</Button>
                    {order.pdfUrl && <Button className="w-full" variant="outline" onClick={() => window.open(order.pdfUrl, "_blank")}>Download Previous PDF</Button>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tracking">
           <ProductionTracking orderId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}