"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Plus, 
  Trash2, 
  ChevronRight, 
  GanttChart,
  BarChart3,
  Download,
  MoreHorizontal,
  Pencil,
  Send,
  AlertCircle
} from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { 
  MarketingOrder, 
  getMarketingOrders, 
  updateMarketingOrder, 
  deleteMarketingOrder,
  OperationBulletinItem, 
  getOperationBulletin, 
  saveOperationBulletin 
} from '@/lib/marketing-orders';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateProductionPlanningPDF, generateOrderPDF, downloadPDF } from '@/lib/pdf-generator';
import html2canvas from 'html2canvas';

export default function OrderPlanningPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [obItems, setObItems] = useState<OperationBulletinItem[]>([]);
  const [isOBDialogOpen, setIsOBDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Interaction State for Gantt
  const [interactingOrder, setInteractingOrder] = useState<string | null>(null);
  const [interactionType, setInteractionType] = useState<'move' | 'resize' | null>(null);
  const [startX, setStartX] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getMarketingOrders();
      setOrders(data.filter(o => o.status !== 'Completed'));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinishDate = (startDate: string, days: number) => {
    if (!startDate || isNaN(days)) return '';
    try {
      return format(addDays(new Date(startDate), Math.max(0, Math.ceil(days) - 1)), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const getAutoOutput = (smv: number, mp: number, efficiency: number) => {
    if (!smv || smv <= 0) return 0;
    return Math.round((480 * mp * (efficiency / 100)) / smv);
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<MarketingOrder>) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const merged = { ...order, ...updates };
    
    if ('smv' in updates || 'manpower' in updates || 'efficiency' in updates) {
      merged.sewingOutputPerDay = getAutoOutput(merged.smv || 0, merged.manpower || 0, merged.efficiency || 70);
      updates.sewingOutputPerDay = merged.sewingOutputPerDay;
    }

    if ('sewingOutputPerDay' in updates || 'quantity' in updates) {
      const days = merged.sewingOutputPerDay && merged.sewingOutputPerDay > 0 
        ? (merged.quantity / merged.sewingOutputPerDay) 
        : (merged.operationDays || 0);
      
      merged.operationDays = Math.ceil(days);
      updates.operationDays = merged.operationDays;
    }

    if ('operationDays' in updates || 'sewingStartDate' in updates) {
       merged.sewingFinishDate = calculateFinishDate(merged.sewingStartDate || '', merged.operationDays || 0);
       updates.sewingFinishDate = merged.sewingFinishDate;
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));

    try {
      const success = await updateMarketingOrder(orderId, updates);
      if (!success) {
        toast({ title: "Error", description: "Storage error. Please refresh.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
      if (confirm('Are you sure you want to delete this order?')) {
          try {
              const success = await deleteMarketingOrder(orderId);
              if (success) {
                  toast({ title: 'Success', description: 'Order deleted successfully' });
                  fetchOrders();
              } else {
                  toast({ title: 'Error', description: 'Failed to delete order', variant: 'destructive' });
              }
          } catch (error) {
              console.error('Error deleting order:', error);
          }
      }
  };

  const handleExportOrderPDF = async (order: MarketingOrder) => {
      try {
          const pdfUrl = await generateOrderPDF(order);
          downloadPDF(pdfUrl, `Order_${order.orderNumber}.pdf`);
          toast({ title: 'Success', description: 'Order PDF exported successfully' });
      } catch (error) {
          console.error('Error exporting order PDF:', error);
          toast({ title: 'Error', description: 'Failed to export order PDF', variant: 'destructive' });
      }
  };

  const handleReleaseOrder = async (order: MarketingOrder) => {
    if (!order.cuttingStartDate || !order.sewingStartDate || !order.packingStartDate) {
      if (!confirm('Some planned dates are missing. Release anyway?')) return;
    } else {
      if (!confirm(`Release order ${order.orderNumber} to production teams (Cutting, Sewing, Packing)?`)) return;
    }

    try {
      const response = await fetch('/api/production-release', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          orderId: order.id,
          updates: {
             // Pass current values to ensure backend has latest
             cuttingStartDate: order.cuttingStartDate,
             cuttingFinishDate: order.cuttingFinishDate,
             packingStartDate: order.packingStartDate,
             packingFinishDate: order.packingFinishDate,
             // Ensure sewing dates are also synced if changed recently
             sewingStartDate: order.sewingStartDate,
             sewingFinishDate: order.sewingFinishDate
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to release');
      }
      
      toast({ title: "Success", description: "Order released to production teams." });
      
      // Update local state status
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Cutting' } : o));

    } catch (error: any) {
      console.error('Release failed:', error);
      toast({ title: "Release Failed", description: error.message, variant: "destructive" });
    }
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= orders.length) return;
    const newOrders = [...orders];
    const item = newOrders.splice(index, 1)[0];
    newOrders.splice(newIndex, 0, item);
    setOrders(newOrders);
    // Note: Re-sequencing is purely visual here unless we persist sequence field
  };

  const onInteractionStart = (e: React.MouseEvent, order: MarketingOrder, type: 'move' | 'resize') => {
    e.preventDefault();
    setInteractingOrder(order.id);
    setInteractionType(type);
    setStartX(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactingOrder || !interactionType) return;
      const order = orders.find(o => o.id === interactingOrder);
      if (!order) return;
      
      const deltaX = e.clientX - startX;
      const dayWidth = 35; 

      if (interactionType === 'move') {
        const deltaDays = Math.round(deltaX / dayWidth);
        if (deltaDays === 0) return;
        
        const currentStart = order.sewingStartDate ? new Date(order.sewingStartDate) : new Date();
        const newStartDate = addDays(currentStart, deltaDays);
        const dateStr = format(newStartDate, 'yyyy-MM-dd');
        
        if (dateStr !== order.sewingStartDate) {
           handleUpdateOrder(interactingOrder, { sewingStartDate: dateStr });
           setStartX(e.clientX);
        }
      } else {
        const deltaDays = Math.round(deltaX / dayWidth);
        if (deltaDays === 0) return;
        
        const newDays = Math.max(1, (order.operationDays || 1) + deltaDays);
        if (newDays !== order.operationDays) {
           handleUpdateOrder(interactingOrder, { operationDays: newDays });
           setStartX(e.clientX);
        }
      }
    };

    const handleMouseUp = () => {
      setInteractingOrder(null);
      setInteractionType(null);
    };

    if (interactingOrder) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interactingOrder, interactionType, orders, startX]);

  const openOBDialog = async (order: MarketingOrder) => {
    setSelectedOrder(order);
    const items = await getOperationBulletin(order.id, order.productCode);
    setObItems(items);
    setIsOBDialogOpen(true);
  };

  const handleSaveOB = async () => {
    if (!selectedOrder) return;
    try {
      // Calculate totals from breakdown
      const totalSMV = obItems.reduce((acc, item) => acc + (item.smv || 0), 0);
      const totalManpower = obItems.reduce((acc, item) => acc + (item.manpower || 0), 0);
      
      const success = await saveOperationBulletin(obItems, selectedOrder.id);
      
      if (success) {
        // Update the order with calculated SMV and Manpower
        await updateMarketingOrder(selectedOrder.id, {
          smv: totalSMV,
          manpower: totalManpower
        });
        
        // Update local state to reflect changes instantly
        handleUpdateOrder(selectedOrder.id, {
          smv: totalSMV,
          manpower: totalManpower
        });

        toast({ title: "Success", description: "Operation bulletin saved and planning data updated." });
        setIsOBDialogOpen(false);
      } else {
        toast({ title: "Error", description: "Failed to save operation bulletin", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error saving OB:', error);
    }
  };

  const addOBRow = () => {
    const nextSeq = obItems.length > 0 ? Math.max(...obItems.map(i => i.sequence)) + 1 : 1;
    setObItems([...obItems, { sequence: nextSeq, operationName: '', machineType: '', smv: 0, manpower: 1 }]);
  };

  const removeOBRow = (index: number) => {
    setObItems(obItems.filter((_, i) => i !== index));
  };

  const updateOBItem = (index: number, field: keyof OperationBulletinItem, value: any) => {
    const newItems = [...obItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setObItems(newItems);
  };

  const ganttChartRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    setIsExporting(true);
    toast({ title: "Preparing PDF", description: "Capturing planning data and charts..." });

    try {
      // Capture the Gantt chart as an image
      let ganttImageData: string | undefined;
      if (ganttChartRef.current) {
        try {
          const canvas = await html2canvas(ganttChartRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          ganttImageData = canvas.toDataURL('image/png');
        } catch (error) {
          console.warn('Could not capture Gantt chart:', error);
        }
      }

      // Generate PDF using the established pattern
      const pdfUrl = await generateProductionPlanningPDF(orders, ganttImageData);
      downloadPDF(pdfUrl, `Production_Planning_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      
      toast({ title: "Success", description: "Planning report exported successfully" });
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast({ title: "Export Failed", description: "Could not generate PDF report", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (!user || (user.role !== 'factory' && user.role !== 'planning' && user.role !== 'marketing')) {
    return <div className="p-8 text-center">Unauthorized Access</div>;
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Order Production Planning
          </h1>
          <p className="text-muted-foreground">Automated sequencing and duration control.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleExportPDF} 
            variant="outline" 
            className="border-primary/20 hover:bg-primary/5 text-primary"
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button onClick={fetchOrders} variant="secondary" size="sm" className="h-[40px]">
            Refresh Data
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-3 px-6">
            <CardTitle className="text-lg font-semibold flex items-center">
              <GanttChart className="mr-2 h-5 w-5 text-primary" />
              Planning Master Sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[80px]">SEQ</TableHead>
                    <TableHead className="min-w-[120px]">ORDER NO / PRODUCT</TableHead>
                    <TableHead>PLACEMENT</TableHead>
                    <TableHead>DELIVERY</TableHead>
                    <TableHead className="text-right">QTY</TableHead>
                    <TableHead className="text-right">SMV/MP</TableHead>
                    <TableHead className="text-center font-bold text-primary border-x bg-primary/5">SEWING O/P</TableHead>
                    
                    {/* Dates Section */}
                    <TableHead className="text-center bg-blue-50/50 text-blue-700 border-l">CUTTING</TableHead>
                    <TableHead className="text-center bg-green-50/50 text-green-700 border-x">SEWING</TableHead>
                    <TableHead className="text-center bg-amber-50/50 text-amber-700 border-r">PACKING</TableHead>
                    
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={14} className="h-32 text-center text-xs">Loading production data...</TableCell>
                    </TableRow>
                  ) : orders.map((order, idx) => (
                    <TableRow key={order.id} className="hover:bg-primary/5 transition-colors group">
                      <TableCell className="font-medium p-2">
                        <div className="flex items-center space-x-1">
                          <span className="w-4 text-[10px]">{idx + 1}</span>
                          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity no-print">
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => moveRow(idx, 'up')} disabled={idx === 0}>
                              <ChevronRight className="h-3 w-3 -rotate-90" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => moveRow(idx, 'down')} disabled={idx === orders.length - 1}>
                              <ChevronRight className="h-3 w-3 rotate-90" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-[10px]">{order.orderNumber}</span>
                          <span className="text-[9px] text-muted-foreground">{order.productCode}</span>
                          {order.isNewProduct && (
                            <Badge variant="outline" className="w-fit text-[8px] h-4 px-1 border-blue-200 text-blue-600 bg-blue-50">
                              New Product
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px]">
                        <div>{order.orderPlacementDate}</div>
                        {order.isNewProduct && (
                           <div className="text-[8px] text-orange-600 font-medium mt-1 flex items-center">
                             <AlertCircle className="w-2 h-2 mr-1" />
                             Sample Check
                           </div>
                        )}
                      </TableCell>
                      <TableCell className="text-[10px]">{order.plannedDeliveryDate}</TableCell>
                      <TableCell className="text-right font-semibold text-[10px]">{order.quantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-1 items-end">
                           <div className="flex items-center gap-1">
                             <span className="text-[8px] text-muted-foreground">S:</span>
                             <Input 
                                type="number" 
                                step="0.01" 
                                className="w-10 h-5 text-right text-[9px] p-0 border-none bg-transparent hover:bg-muted/20"
                                value={order.smv || 0}
                                onChange={(e) => handleUpdateOrder(order.id, { smv: parseFloat(e.target.value) })}
                              />
                           </div>
                           <div className="flex items-center gap-1">
                             <span className="text-[8px] text-muted-foreground">M:</span>
                             <Input 
                                type="number" 
                                className="w-10 h-5 text-right text-[9px] p-0 border-none bg-transparent hover:bg-muted/20"
                                value={order.manpower || 0}
                                onChange={(e) => handleUpdateOrder(order.id, { manpower: parseInt(e.target.value) })}
                              />
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center border-x bg-primary/5">
                         <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-primary">{order.sewingOutputPerDay || 0}</span>
                            <span className="text-[8px] text-muted-foreground">{order.operationDays || 0} days</span>
                         </div>
                      </TableCell>
                      
                      {/* CUTTING DATES */}
                      <TableCell className="p-1 border-l bg-blue-50/10">
                         <div className="flex flex-col gap-1">
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={order.cuttingStartDate || ''}
                              onChange={(e) => handleUpdateOrder(order.id, { cuttingStartDate: e.target.value })}
                              placeholder="Start"
                           />
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={order.cuttingFinishDate || ''}
                              onChange={(e) => handleUpdateOrder(order.id, { cuttingFinishDate: e.target.value })}
                           />
                         </div>
                      </TableCell>

                       {/* SEWING DATES */}
                      <TableCell className="p-1 border-x bg-green-50/10">
                         <div className="flex flex-col gap-1">
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={order.sewingStartDate || ''}
                              onChange={(e) => handleUpdateOrder(order.id, { sewingStartDate: e.target.value })}
                           />
                           <div className="text-[8px] font-medium text-center text-green-700">
                             {order.sewingFinishDate || '-'}
                           </div>
                         </div>
                      </TableCell>

                       {/* PACKING DATES */}
                      <TableCell className="p-1 border-r bg-amber-50/10">
                         <div className="flex flex-col gap-1">
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={order.packingStartDate || ''}
                              onChange={(e) => handleUpdateOrder(order.id, { packingStartDate: e.target.value })}
                           />
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={order.packingFinishDate || ''}
                              onChange={(e) => handleUpdateOrder(order.id, { packingFinishDate: e.target.value })}
                           />
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openOBDialog(order)} title="Operation Breakdown" className="h-8 w-8 p-0">
                            <FileText className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => toast({ title: "Notice", description: "Please use the 'Marketing Orders' page to edit full order details." })}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReleaseOrder(order)}
                                className="text-blue-600 focus:text-blue-600"
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Release to Production
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleExportOrderPDF(order)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Export PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteOrder(order.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      {/* Gantt Chart Section */}
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="py-3 px-6 bg-primary/5 border-b">
          <CardTitle className="text-lg font-semibold flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-primary" />
            Visual Timeline & Grid
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div ref={ganttChartRef} className="h-[500px] w-full border rounded-xl bg-background/50 relative overflow-hidden flex flex-col">
              <div className="flex flex-1 overflow-auto">
                <div className="min-w-fit flex flex-col relative pt-10">
                  {/* Fixed Date Header */}
                  <div className="flex h-10 border-b border-muted/30 absolute top-0 left-0 right-0 bg-background z-40">
                    <div className="w-[180px] shrink-0 sticky left-0 bg-background z-50 border-r px-4 flex items-center text-[9px] font-bold uppercase text-muted-foreground mr-1">
                      ORDER NO
                    </div>
                    <div className="flex-1 flex gap-0 h-full relative">
                      {Array.from({ length: 31 }).map((_, i) => (
                        <div key={i} className="w-[35px] shrink-0 border-r border-muted/20 flex items-center justify-center text-[9px] font-medium text-muted-foreground bg-muted/5">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grid Content */}
                  <div className="flex-1 relative py-2">
                    {/* FULL HEIGHT VERTICAL GRID LINES */}
                    <div className="absolute inset-y-0 left-[180px] flex pointer-events-none z-0">
                      {Array.from({ length: 31 }).map((_, i) => (
                        <div key={i} className="w-[35px] border-r border-primary/5 h-full" />
                      ))}
                    </div>

                    {orders.map((order, idx) => {
                      const sewingStartStr = order.sewingStartDate;
                      const duration = Math.max(1, order.operationDays || 1);
                      const day = sewingStartStr ? new Date(sewingStartStr).getDate() : null;
                      const colorHue = 210 + (idx * 40) % 150;

                      return (
                        <div key={order.id} className="flex h-10 group/gantt relative hover:bg-muted/5 transition-colors z-10">
                          <div className="w-[180px] shrink-0 sticky left-0 bg-background/80 backdrop-blur-md z-20 border-r px-4 flex items-center text-[9px] truncate font-medium group-hover/gantt:text-primary transition-colors">
                            {order.orderNumber}
                          </div>
                          <div className="flex-1 flex gap-0 relative">
                            <div className="w-[1100px] h-full" /> 

                            {day !== null && (
                              <div 
                                className={`absolute h-7 top-1.5 cursor-move flex items-center px-2 text-[9px] truncate rounded shadow-sm transition-all group-hover/gantt:shadow-md ${interactingOrder === order.id ? 'ring-2 ring-primary ring-offset-1 z-30 scale-[1.01]' : 'z-10'}`}
                                style={{ 
                                  left: `${(day - 1) * 35 + 4}px`, 
                                  width: `${duration * 35}px`,
                                  backgroundColor: `hsla(${colorHue}, 70%, 50%, 0.15)`,
                                  borderLeft: `3px solid hsla(${colorHue}, 70%, 50%, 0.8)`,
                                  color: `hsla(${colorHue}, 70%, 30%, 1)`
                                }}
                                onMouseDown={(e) => onInteractionStart(e, order, 'move')}
                              >
                                <span className="font-bold flex-1 truncate">{duration}d - {order.productCode}</span>
                                
                                <div 
                                  className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-black/10 transition-colors rounded-r no-print"
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    onInteractionStart(e, order, 'resize');
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Operation Bulletin Dialog */}
      <Dialog open={isOBDialogOpen} onOpenChange={setIsOBDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 glass-morphism border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2 bg-primary/5 border-b">
            <DialogTitle className="flex items-center text-xl">
              Operation Bulletin - {selectedOrder?.productCode}
              <Badge className="ml-4 bg-primary/20 text-primary border-none">{selectedOrder?.productName}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Seq</TableHead>
                  <TableHead>Operation Name</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead className="text-right">SMV</TableHead>
                  <TableHead className="text-right">MP</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obItems.map((item, index) => (
                  <TableRow key={index} className="group hover:bg-primary/5 transition-colors">
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.sequence} 
                        onChange={(e) => updateOBItem(index, 'sequence', parseInt(e.target.value))}
                        className="h-8 text-center text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.operationName} 
                        placeholder="e.g. Front Pocket Join"
                        onChange={(e) => updateOBItem(index, 'operationName', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.machineType} 
                        placeholder="SNLS / Overlock"
                        onChange={(e) => updateOBItem(index, 'machineType', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={item.smv} 
                        onChange={(e) => updateOBItem(index, 'smv', parseFloat(e.target.value))}
                        className="h-8 text-right font-medium text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={item.manpower} 
                        onChange={(e) => updateOBItem(index, 'manpower', parseInt(e.target.value))}
                        className="h-8 text-right font-medium text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeOBRow(index)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={addOBRow} variant="outline" className="w-full mt-4 border-dashed border-2 bg-muted/20 hover:bg-muted/40 transition-colors">
              <Plus className="mr-2 h-4 w-4" /> Add Operation
            </Button>

            <div className="grid grid-cols-2 gap-4 mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Line SMV</span>
                <span className="font-bold text-2xl text-primary">{obItems.reduce((acc, i) => acc + (i.smv || 0), 0).toFixed(3)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Manpower</span>
                <span className="font-bold text-2xl text-primary">{obItems.reduce((acc, i) => acc + (i.manpower || 0), 0)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t">
            <Button variant="outline" onClick={() => setIsOBDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOB} className="px-8 shadow-lg shadow-primary/20">Save Planning Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
