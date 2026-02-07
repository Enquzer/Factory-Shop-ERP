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
import { Badge } from "@/components/ui/badge";
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
import { CreateMarketingOrderDialog } from "@/components/create-marketing-order-dialog";
import { useAuth } from "@/contexts/auth-context";
import { useSystemSettings } from '@/contexts/system-settings-context';

export default function MarketingOrdersPage() {
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<MarketingOrder[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  
  const canEdit = user?.role === 'factory' || user?.role === 'marketing';
  
  const isSuperAdmin = (currentUser: any) => {
    // Check if the user is a super admin for order deletion purposes
    // Factory users are considered super admins for order deletion
    return currentUser?.username === 'admin' || 
           currentUser?.username === 'factory';
  };



  const [availableUsers, setAvailableUsers] = useState<{id: number, username: string}[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        const pUsers = data.filter((u: any) => 
          ['planning', 'sample_maker', 'cutting', 'sewing', 'finishing', 'packing', 'quality_inspection', 'factory'].includes(u.role)
        );
        setAvailableUsers(pUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    // Filter orders based on date range
    if (!startDate && !endDate) {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && end) {
          return orderDate >= start && orderDate <= end;
        } else if (start) {
          return orderDate >= start;
        } else if (end) {
          return orderDate <= end;
        }
        return true;
      });
      setFilteredOrders(filtered);
    }
  }, [orders, startDate, endDate]);

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

      const branding = {
        companyName: settings.companyName,
        logo: settings.logo || undefined,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor
      };

      const pdfBlob = await generateOrderPDF(order, branding);
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
      const branding = {
        companyName: settings.companyName,
        logo: settings.logo || undefined,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor
      };

      const pdfBlob = await generateSummaryReport(filteredOrders, branding);
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

  const handleExportAllOrdersToPdf = async () => {
    try {
      // Create a PDF with all the orders data in a table format
      const jsPDF = (await import('jspdf')).jsPDF;
      await import('jspdf-autotable'); // Ensure autotable plugin is imported
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = (doc as any).internal.pageSize.getWidth();
      
      // Hex to RGB helper
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] : [45, 55, 72]; // Default dark blue
      };

      const primaryColor = settings.primaryColor || '#2d3748';
      const primaryRgb = hexToRgb(primaryColor);

      // Add header with company logo and title
      // @ts-ignore
      doc.setFillColor(...primaryRgb);
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica');
      doc.text(settings.companyName || 'Carement Fashion', 14, 15);
      
      // Report title
      doc.setFontSize(14);
      doc.text('Marketing Orders Report', pageWidth / 2, 15, { align: 'center' });
      
      // Generated date
      doc.setFontSize(10);
      doc.setFont('helvetica');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 15, { align: 'right' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Add subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica');
      doc.text('Order Summary', 14, 35);
      
      // Define table columns
      const columns = [
        { header: 'Order #', dataKey: 'orderNumber' },
        { header: 'Product', dataKey: 'productName' },
        { header: 'Code', dataKey: 'productCode' },
        { header: 'Qty', dataKey: 'quantity' },
        { header: 'Produced', dataKey: 'produced' },
        { header: 'Remaining', dataKey: 'remaining' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Team', dataKey: 'assignedTeam' },
        { header: 'Created By', dataKey: 'createdBy' },
        { header: 'Date', dataKey: 'date' },
      ];
      
      // Process the orders data
      const processedOrders = orders.map(order => {
        const produced = producedQuantities[order.id] || 0;
        const remaining = order.quantity - produced;
        
        // Determine assigned team based on status
        let assignedTeam = 'N/A';
        switch(order.status) {
          case 'Placed Order': assignedTeam = 'Sales/Entry'; break;
          case 'Planning': assignedTeam = 'Planning Team'; break;
          case 'Sample Making': assignedTeam = 'Sample Room'; break;
          case 'Cutting': assignedTeam = 'Cutting Section'; break;
          case 'Sewing': assignedTeam = 'Sewing Floor'; break;
          case 'Finishing': assignedTeam = 'Finishing Section'; break;
          case 'Quality Inspection': assignedTeam = 'QC Team'; break;
          case 'Packing': assignedTeam = 'Packing Section'; break;
          case 'Delivery': assignedTeam = 'Logistics'; break;
          case 'Completed': assignedTeam = 'Finished'; break;
          default: assignedTeam = order.status;
        }
        
        return {
          orderNumber: order.orderNumber,
          productName: order.productName,
          productCode: order.productCode,
          quantity: order.quantity,
          produced: produced,
          remaining: remaining,
          status: order.isCompleted ? 'Completed' : order.status,
          assignedTeam: assignedTeam,
          createdBy: order.createdBy,
          date: new Date(order.createdAt).toLocaleDateString(),
        };
      });
      
      // Add table to PDF
      (doc as any).autoTable({
        head: [columns.map(col => col.header)],
        body: processedOrders.map(order => 
          columns.map(col => order[col.dataKey as keyof typeof order])
        ),
        startY: 45,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: primaryRgb as any,
          textColor: [255, 255, 255],
          fontSize: 10,
        },
        bodyStyles: {
          textColor: [40, 40, 40],
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        margin: { top: 45, left: 10, right: 10 },
        pageBreak: 'auto',
        columnStyles: {
          0: { cellWidth: 35 }, // Order #
          1: { cellWidth: 40 }, // Product
          2: { cellWidth: 25 }, // Code
          3: { cellWidth: 18 }, // Qty
          4: { cellWidth: 20 }, // Produced
          5: { cellWidth: 20 }, // Remaining
          6: { cellWidth: 25 }, // Status
          7: { cellWidth: 30 }, // Team
          8: { cellWidth: 25 }, // Created By
          9: { cellWidth: 25 }, // Date
        },
      });
      
      // Add summary statistics
      const finalY = (doc as any).lastAutoTable.finalY || 45;
      doc.setFontSize(12);
      doc.setFont('helvetica');
      doc.text('Report Summary', 14, finalY + 15);
      
      doc.setFont('helvetica');
      doc.setFontSize(10);
      doc.text(`Total Orders: ${orders.length}`, 14, finalY + 22);
      doc.text(`Total Quantity: ${orders.reduce((sum, order) => sum + order.quantity, 0)}`, 14, finalY + 28);
      
      // Save the PDF
      doc.save('marketing_orders_report.pdf');
      
      toast({
        title: "Success",
        description: "Marketing orders report exported successfully.",
      });
    } catch (error) {
      console.error("Error exporting marketing orders report:", error);
      toast({
        title: "Error",
        description: "Failed to export marketing orders report. Please try again.",
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
        {canEdit && (
          <>
            <Button onClick={() => setIsCreateDialogOpen(true)}>Create New Order</Button>
            <CreateMarketingOrderDialog 
              open={isCreateDialogOpen} 
              onOpenChange={setIsCreateDialogOpen}
              onOrderCreated={fetchOrders}
              availableUsers={availableUsers}
            />
          </>
        )}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Marketing Orders</CardTitle>
                <CardDescription>Manage your marketing orders.</CardDescription>
              </div>
              <Button onClick={handleExportAllOrdersToPdf} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export All to PDF
              </Button>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Prod.</TableHead>
                      <TableHead>Process Status</TableHead>
                      <TableHead>Assigned Team</TableHead>
                      <TableHead>Overall Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Date</TableHead>
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
                        statusDisplay = 'Sewing' as MarketingOrderStatus;
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
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {['Planning', 'Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection', 'Packing', 'Delivery'].map((stage) => {
                                const statuses = processStatuses[order.id] || [];
                                const process = statuses.find((p: any) => p.processStage === stage);
                                
                                let statusIcon = '⏳'; // Default pending icon
                                let statusColor = 'text-gray-500';
                                let statusTitle = `${stage}: Pending`;
                                
                                if (process) {
                                  if (process.status === 'Completed') {
                                    statusIcon = '✅';
                                    statusColor = 'text-green-600';
                                    statusTitle = `${stage}: Completed`;
                                  } else if (process.status === 'Partial') {
                                    statusIcon = '🔄';
                                    statusColor = 'text-yellow-600';
                                    statusTitle = `${stage}: Partial (${process.percentage || 0}%)`;
                                  }
                                }
                                
                                return (
                                  <span 
                                    key={stage} 
                                    title={statusTitle}
                                    className={`${statusColor} text-xs flex items-center gap-1 border rounded px-1.5 py-0.5`}>
                                    <span>{statusIcon}</span>
                                    <span className="hidden sm:inline">{stage.split(' ').map(word => word[0]).join('')}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {(() => {
                                switch(order.status) {
                                  case 'Placed Order': return 'Sales/Entry';
                                  case 'Planning': return 'Planning Team';
                                  case 'Sample Making': return 'Sample Room';
                                  case 'Cutting': return 'Cutting Section';
                                  case 'Sewing': return 'Sewing Floor';
                                  case 'Finishing': return 'Finishing Section';
                                  case 'Quality Inspection': return 'QC Team';
                                  case 'Packing': return 'Packing Section';
                                  case 'Delivery': return 'Logistics';
                                  case 'Completed': return 'Finished';
                                  default: return order.status;
                                }
                              })()}
                            </Badge>
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
                                onClick={() => handleExportToPdf(order.id)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <>
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
                                  {(user?.role === 'factory') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openDeleteDialog(order.id)}
                                    disabled={!isSuperAdmin(user) && order.status !== 'Placed Order'}
                                    title={!isSuperAdmin(user) && order.status !== 'Placed Order' ? "Only orders in Placed Order status can be deleted by non-super admins" : "Delete Order"}
                                    className={(!isSuperAdmin(user) && order.status !== 'Placed Order') ? "opacity-50 cursor-not-allowed" : "text-red-500 hover:text-red-700 hover:bg-red-50"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  )}
                                  <Button
                                    onClick={() => markAsCompleted(order.id)}
                                    disabled={order.status !== ('Delivery' as MarketingOrderStatus) || remaining > 0 || order.status === ('Placed Order' as MarketingOrderStatus)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
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
                {/* Date Filter Section */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-medium mb-3">Filter by Date Range</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="w-full"
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Summary Report */}
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Summary Report</h3>
                    <p className="text-sm text-muted-foreground">Overview of all marketing orders</p>
                    {startDate || endDate ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Showing {filteredOrders.length} of {orders.length} orders
                        {startDate && ` from ${new Date(startDate).toLocaleDateString()}`}
                        {endDate && ` to ${new Date(endDate).toLocaleDateString()}`}
                      </p>
                    ) : null}
                  </div>
                  <Button onClick={() => handleExportSummaryToPdf()}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>

                {/* Orders Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>QC Report</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
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
                                }}`}></div>
                                <span>{order.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.qualityInspectionReportUrl ? (
                                <a 
                                  href={order.qualityInspectionReportUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  View QC PDF
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground italic text-[10px]">No Report</span>
                              )}
                            </TableCell>
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
                                  onClick={() => handleExportToPdf(order.id)}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {startDate || endDate ? 'No orders found for the selected date range.' : 'No marketing orders found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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