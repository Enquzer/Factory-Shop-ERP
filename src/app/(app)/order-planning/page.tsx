"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
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
  AlertCircle, 
  CheckCircle2,
  Layers, 
  Shirt, 
  Rocket,
  BarChart4,
  ChevronDown 
} from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { 
  MarketingOrder, 
  MarketingOrderStatus,
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
import { authenticatedFetch } from '@/lib/utils';
import { generateBOMPDF, downloadBOMPDF } from '@/lib/bom-pdf-generator';
import html2canvas from 'html2canvas';

import { cn } from "@/lib/utils";
import { MaterialRequisitionsDialog } from '@/components/production/material-requisitions-dialog';
import { BOMModificationDialog } from '@/components/production/bom-modification-dialog';
import { MarketingOrderComponent, updateMarketingOrderComponent, initializeOrderComponents } from '@/lib/marketing-orders';
import { OperatorAssignmentSidebar } from '@/components/hr/operator-assignment-sidebar';
import { UserPlus } from 'lucide-react';

interface PlanningRow extends MarketingOrder {
  displayId: string;
  isComponent: boolean;
  mainOrderId?: string;
  componentId?: number;
  componentName?: string;
  orderIndex: number;
  componentIndex?: number;
  isMock?: boolean;
}

export default function OrderPlanningPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [obItems, setObItems] = useState<OperationBulletinItem[]>([]);
  const [isOBDialogOpen, setIsOBDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Requisition Dialog State
  const [isReqDialogOpen, setIsReqDialogOpen] = useState(false);
  const [reqOrderId, setReqOrderId] = useState<string | null>(null);
  const [reqOrderNum, setReqOrderNum] = useState<string>('');
  
  // BOM Modification Dialog State
  const [isBomDialogOpen, setIsBomDialogOpen] = useState(false);
  const [bomOrderDetails, setBomOrderDetails] = useState<any>(null);
  const [bomItems, setBomItems] = useState<any[]>([]);

  // Operator Assignment State
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assigningOp, setAssigningOp] = useState<{ sequence: number; name: string; componentName?: string } | null>(null);

  // Interaction State for Gantt
  const [interactingOrder, setInteractingOrder] = useState<string | null>(null);
  const [interactionType, setInteractionType] = useState<'move' | 'resize' | null>(null);
  const [startX, setStartX] = useState(0);

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await getMarketingOrders();
      // Filter out orders that are in Store, Delivery, or Completed status
      // These orders are no longer in active production planning
      const activeStatuses: MarketingOrderStatus[] = ['Store', 'Delivery', 'Completed'];
      setOrders(data.filter(o => !activeStatuses.includes(o.status)));
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

  const formatDateValue = (dateString: string): string => {
    if (!dateString) return '';
    
    // If it's already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's a datetime string with time component, extract just the date part
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/.test(dateString)) {
      return dateString.split(' ')[0];
    }
    
    // For other formats, try to parse and format as YYYY-MM-DD
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Format as YYYY-MM-DD
      return format(date, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };


  const getAutoOutput = (smv: number, mp: number, efficiency: number) => {
    if (!smv || smv <= 0) return 0;
    return Math.round((480 * mp * (efficiency / 100)) / smv);
  };

  const handleUpdatePlanning = async (id: string, updates: any, isComponent: boolean = false, mainOrderId?: string) => {
    if (id.includes('-mock-')) {
      toast({ title: "Initialize Required", description: "Please use the 'Initialize Components' button in the menu first.", variant: "destructive" });
      return;
    }

    let order: any;
    if (isComponent) {
      const parent = orders.find(o => o.id === mainOrderId);
      const comp = parent?.components?.find(c => c.id === parseInt(id.split('-').pop() || ''));
      if (!comp) return;
      order = { 
        ...comp, 
        quantity: parent?.quantity,
        efficiency: comp.efficiency !== undefined ? comp.efficiency : (parent?.efficiency || 70)
      };
    } else {
      order = orders.find(o => o.id === id);
    }
    
    if (!order) return;

    const merged = { ...order, ...updates };
    
    // Auto-calculations
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

    // Update Local State
    if (isComponent && mainOrderId) {
      setOrders(prev => prev.map(o => {
        if (o.id === mainOrderId) {
          return {
            ...o,
            components: o.components?.map(c => c.id === parseInt(id.split('-').pop() || '') ? { ...c, ...updates } : c)
          };
        }
        return o;
      }));
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    }

    // Persist to DB
    try {
      let success = false;
      if (isComponent && mainOrderId) {
        success = await updateMarketingOrderComponent(mainOrderId, parseInt(id.split('-').pop() || ''), updates);
      } else {
        success = await updateMarketingOrder(id, updates);
      }
      
      if (!success) {
        toast({ title: "Error", description: "Storage error. Please refresh.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error updating planning:', error);
    }
  };

  // Helper alias for backward compatibility or simpler calls
  const handleUpdateOrder = (id: string, updates: any) => handleUpdatePlanning(id, updates);

  const expandedOrders = React.useMemo<PlanningRow[]>(() => {
    return orders.flatMap((order, oIdx) => {
      if (order.components && order.components.length > 0) {
        return order.components.map((comp, cIdx) => ({
          ...order,
          displayId: `${order.id}-${comp.id}`,
          mainOrderId: order.id,
          componentId: comp.id,
          componentName: comp.componentName,
          orderIndex: oIdx,
          componentIndex: cIdx,
          // Use component specific planning data
          smv: comp.smv || 0,
          manpower: comp.manpower || 0,
          sewingOutputPerDay: comp.sewingOutputPerDay || 0,
          operationDays: comp.operationDays || 0,
          efficiency: comp.efficiency !== undefined ? comp.efficiency : (order.efficiency || 70),
          sewingStartDate: comp.sewingStartDate,
          sewingFinishDate: comp.sewingFinishDate,
          cuttingStartDate: comp.cuttingStartDate,
          cuttingFinishDate: comp.cuttingFinishDate,
          packingStartDate: comp.packingStartDate,
          packingFinishDate: comp.packingFinishDate,
          isComponent: true
        } as PlanningRow));
      }

      // Auto-split if piecesPerSet > 1 OR style has components, but no components yet
      const styleCompList = order.styleComponents ? JSON.parse(order.styleComponents) : [];
      const hasStyleComponents = Array.isArray(styleCompList) && styleCompList.length > 0;
      
      if ((order.piecesPerSet && order.piecesPerSet > 1) || hasStyleComponents) {
        const count = hasStyleComponents ? styleCompList.length : (order.piecesPerSet || 0);
        return Array.from({ length: count }).map((_, cIdx) => ({
          ...order,
          displayId: `${order.id}-mock-${cIdx}`,
          mainOrderId: order.id,
          orderIndex: oIdx,
          componentIndex: cIdx,
          isComponent: true,
          isMock: true,
          componentName: hasStyleComponents 
            ? styleCompList[cIdx].name 
            : (order.piecesPerSet === 2 ? (cIdx === 0 ? 'Top' : 'Bottom') : `Part ${cIdx + 1}`),
          smv: 0,
          manpower: 0,
          sewingOutputPerDay: 0,
          operationDays: 0,
          efficiency: order.efficiency || 70,
        } as PlanningRow));
     }

      return [{ ...order, displayId: order.id, isComponent: false, orderIndex: oIdx } as PlanningRow];
    });
  }, [orders]);

  const handleInitializeComponents = async (order: MarketingOrder) => {
    const styleCompList = order.styleComponents ? JSON.parse(order.styleComponents) : [];
    const hasStyleComponents = Array.isArray(styleCompList) && styleCompList.length > 0;
    
    const names = hasStyleComponents 
      ? styleCompList.map((c: any) => c.name)
      : (order.piecesPerSet === 2 ? ['Top', 'Bottom'] : Array.from({length: order.piecesPerSet || 0}, (_, i) => `Part ${i+1}`));
      
    if (names.length === 0) {
      toast({ title: "No Parts Defined", description: "This product doesn't have multiple parts defined in Style or Order.", variant: "destructive" });
      return;
    }
    
    if (!confirm(`Initialize ${names.length} components (${names.join(', ')}) for order ${order.orderNumber}?`)) return;
    
    setLoading(true);
    try {
      const success = await initializeOrderComponents(order.id, names);
      if (success) {
        toast({ title: "Success", description: "Components initialized for planning." });
        fetchOrders();
      } else {
        toast({ title: "Error", description: "Failed to initialize components.", variant: "destructive" });
      }
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
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
    if (!order.isMaterialsConfirmed) {
      toast({ 
        title: "Release Blocked", 
        description: "You must confirm material availability in the Fulfillment Center before releasing to production.", 
        variant: "destructive" 
      });
      return;
    }

    const hasMissingDates = !order.cuttingStartDate || !order.sewingStartDate || !order.packingStartDate;
    const confirmMsg = hasMissingDates 
      ? 'Some planned dates are missing. Release anyway?' 
      : `Release order ${order.orderNumber} to production teams (Cutting, Sewing, Packing)?`;

    if (!confirm(confirmMsg)) return;

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
             cuttingStartDate: order.cuttingStartDate,
             cuttingFinishDate: order.cuttingFinishDate,
             packingStartDate: order.packingStartDate,
             packingFinishDate: order.packingFinishDate,
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
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Cutting' } : o));
    } catch (error: any) {
      console.error('Release failed:', error);
      toast({ title: "Release Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      const success = await deleteMarketingOrder(orderToDelete);
      if (success) {
        setOrders(prev => prev.filter(o => o.id !== orderToDelete));
        toast({ title: "Success", description: "Order deleted successfully." });
      } else {
        toast({ title: "Error", description: "Failed to delete order. It may have progressed past 'Placed Order' status.", variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast({ title: "Error", description: error.message || "An error occurred.", variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const moveRow = (oIdx: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? oIdx - 1 : oIdx + 1;
    if (newIndex < 0 || newIndex >= orders.length) return;
    const newOrders = [...orders];
    const item = newOrders.splice(oIdx, 1)[0];
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

  const openOBDialog = async (order: PlanningRow) => {
    if (order.isMock) {
      toast({ title: "Initialize First", description: "Initialize components before adding operation details.", variant: "destructive" });
      return;
    }
    setSelectedOrder(order);
    setSelectedComponent(order.isComponent ? (order.componentName || null) : null);
    const items = await getOperationBulletin(order.id, order.productCode);
    setObItems(items);
    setIsOBDialogOpen(true);
  };

  const handleSaveOB = async () => {
    if (!selectedOrder) return;
    try {
      // Calculate totals for the selected component (or total if none)
      const componentItems = selectedComponent 
        ? obItems.filter(i => i.componentName === selectedComponent)
        : obItems;
        
      const totalSMV = componentItems.reduce((acc, item) => acc + (item.smv || 0), 0);
      const totalManpower = componentItems.reduce((acc, item) => acc + (item.manpower || 0), 0);
      
      const success = await saveOperationBulletin(obItems, selectedOrder.id);
      
      if (success) {
        if (selectedComponent && selectedOrder.components) {
          const comp = selectedOrder.components.find(c => c.componentName === selectedComponent);
          if (comp && comp.id) {
             const displayId = `${selectedOrder.id}-${comp.id}`;
             await handleUpdatePlanning(displayId, {
               smv: totalSMV,
               manpower: totalManpower
             }, true, selectedOrder.id);
          }
        } else {
          // Update the main order with calculated SMV and Manpower
          await updateMarketingOrder(selectedOrder.id, {
            smv: totalSMV,
            manpower: totalManpower
          });
          
          handleUpdateOrder(selectedOrder.id, {
            smv: totalSMV,
            manpower: totalManpower
          });
        }

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
    setObItems([...obItems, { 
      sequence: nextSeq, 
      operationName: '', 
      machineType: '', 
      smv: 0, 
      manpower: 1,
      componentName: selectedComponent || undefined
    }]);
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

  const handleExportPDF = async (type: 'full' | 'cutting' | 'sewing' | 'packing' = 'full') => {
    setIsExporting(true);
    toast({ title: `Preparing ${type.toUpperCase()} PDF`, description: "Capturing planning data..." });

    try {
      // Capture the Gantt chart as an image (only for full plan)
      let ganttImageData: string | undefined;
      if (type === 'full' && ganttChartRef.current) {
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

      // If Sewing Plan, fetch OB items for each expanded order
      let obData: Record<string, any[]> | undefined;
      if (type === 'sewing') {
        obData = {};
        for (const order of expandedOrders) {
          // Identify order ID and optionally component name
          const ob = await getOperationBulletin(order.id, order.componentName || undefined);
          if (ob && ob.length > 0) {
            obData[order.displayId] = ob;
          }
        }
      }

      // Generate PDF using the established pattern
      const pdfUrl = await generateProductionPlanningPDF(expandedOrders, ganttImageData, type, obData);
      downloadPDF(pdfUrl, `${type.charAt(0).toUpperCase() + type.slice(1)}_Planning_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      
      toast({ title: "Success", description: `${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully` });
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="border-primary/20 hover:bg-primary/5 text-primary"
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Report Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportPDF('full')}>Full Planning Report</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF('cutting')}>Cutting Plan PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF('sewing')}>Sewing Plan & OB PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPDF('packing')}>Packing Plan PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => router.push('/order-planning/consumption')} 
            variant="outline" 
            size="sm" 
            className="h-[40px] border-primary/20 text-primary hover:bg-primary/5 font-bold"
          >
            <BarChart4 className="mr-2 h-4 w-4" />
            Consumption Analysis
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
                    <TableHead className="w-[60px]">IMAGE</TableHead>
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
                  ) : expandedOrders.map((order, idx) => (
                    <TableRow 
                      key={order.displayId} 
                      className={cn(
                        "hover:bg-primary/5 transition-colors group", 
                        order.isComponent && "bg-slate-50/50",
                        order.isComponent && order.componentIndex !== 0 && "border-t-0"
                      )}
                    >
                      <TableCell className="font-medium p-2 align-top">
                        <div className="flex items-center space-x-1">
                          <span className="w-6 text-[10px] font-bold">
                            {(!order.isComponent || order.componentIndex === 0) ? (
                              <div className="flex items-center gap-1">
                                <span>{order.orderIndex + 1}</span>
                              </div>
                            ) : null}
                          </span>
                          {(!order.isComponent || order.componentIndex === 0) && (
                            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity no-print">
                              <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => moveRow(order.orderIndex, 'up')} disabled={order.orderIndex === 0}>
                                <ChevronRight className="h-3 w-3 -rotate-90" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => moveRow(order.orderIndex, 'down')} disabled={order.orderIndex === orders.length - 1}>
                                <ChevronRight className="h-3 w-3 rotate-90" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-2 align-top">
                        {(!order.isComponent || order.componentIndex === 0) ? (
                          <div className="h-10 w-10 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden shadow-sm">
                            {order.imageUrl ? (
                              <img src={order.imageUrl} alt={order.productCode} className="h-full w-full object-cover" />
                            ) : (
                              <Shirt className="h-5 w-5 text-muted-foreground/30" />
                            )}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             {(!order.isComponent || order.componentIndex === 0) ? (
                               <span 
                                 className="font-semibold text-[10px] cursor-pointer hover:text-primary hover:underline transition-all"
                                 onClick={() => router.push(`/order-planning/${order.id}`)}
                               >
                                 {order.orderNumber}
                               </span>
                             ) : (
                               <span className="text-[10px] text-muted-foreground/40 italic">-- same order --</span>
                             )}
                             {order.isComponent && (
                               <Badge variant="secondary" className={cn("text-[8px] h-4 px-1 uppercase font-bold", order.isMock ? "bg-slate-200 text-slate-500" : "bg-amber-100 text-amber-700")}>
                                 {order.componentName}
                               </Badge>
                             )}
                             {(!order.isComponent || order.componentIndex === 0) && (
                               <span title={order.isMaterialsConfirmed ? "Materials Secured" : "Materials Pending"}>
                                 {order.isMaterialsConfirmed ? (
                                   <CheckCircle2 className="h-3 w-3 text-green-500" />
                                 ) : (
                                   <AlertCircle className="h-3 w-3 text-amber-500" />
                                 )}
                               </span>
                             )}
                          </div>
                          {(!order.isComponent || order.componentIndex === 0) && (
                            <>
                              <span className="text-[9px] text-muted-foreground">{order.productCode}</span>
                              {order.isNewProduct && (
                                <Badge variant="outline" className="w-fit text-[8px] h-4 px-1 border-blue-200 text-blue-600 bg-blue-50">
                                  New Product
                                </Badge>
                              )}
                              {order.isMock && (
                                <Button 
                                  variant="link" 
                                  className="h-4 p-0 text-[8px] text-blue-600 justify-start"
                                  onClick={() => handleInitializeComponents(order)}
                                >
                                  Initialize {order.piecesPerSet} Parts
                                </Button>
                              )}
                            </>
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
                                onChange={(e) => handleUpdatePlanning(order.displayId, { smv: parseFloat(e.target.value) }, order.isComponent, order.mainOrderId)}
                              />
                           </div>
                           <div className="flex items-center gap-1">
                             <span className="text-[8px] text-muted-foreground">M:</span>
                             <Input 
                                type="number" 
                                className="w-10 h-5 text-right text-[9px] p-0 border-none bg-transparent hover:bg-muted/20"
                                value={order.manpower || 0}
                                onChange={(e) => handleUpdatePlanning(order.displayId, { manpower: parseInt(e.target.value) }, order.isComponent, order.mainOrderId)}
                              />
                           </div>
                           <div className="flex items-center gap-1">
                             <span className="text-[8px] text-muted-foreground">E:</span>
                             <Input 
                                type="number" 
                                className="w-10 h-5 text-right text-[9px] p-0 border-none bg-transparent hover:bg-muted/20"
                                value={order.efficiency || 0}
                                onChange={(e) => handleUpdatePlanning(order.displayId, { efficiency: parseFloat(e.target.value) }, order.isComponent, order.mainOrderId)}
                              />
                              <span className="text-[8px] text-muted-foreground">%</span>
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
                              value={formatDateValue(order.cuttingStartDate || '')}
                              onChange={(e) => handleUpdatePlanning(order.displayId, { cuttingStartDate: e.target.value }, order.isComponent, order.mainOrderId)}
                              placeholder="Start"
                           />
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={formatDateValue(order.cuttingFinishDate || '')}
                              onChange={(e) => handleUpdatePlanning(order.displayId, { cuttingFinishDate: e.target.value }, order.isComponent, order.mainOrderId)}
                           />
                         </div>
                      </TableCell>

                       {/* SEWING DATES */}
                      <TableCell className="p-1 border-x bg-green-50/10">
                         <div className="flex flex-col gap-1">
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={formatDateValue(order.sewingStartDate || '')}
                              onChange={(e) => handleUpdatePlanning(order.displayId, { sewingStartDate: e.target.value }, order.isComponent, order.mainOrderId)}
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
                              value={formatDateValue(order.packingStartDate || '')}
                              onChange={(e) => handleUpdatePlanning(order.displayId, { packingStartDate: e.target.value }, order.isComponent, order.mainOrderId)}
                           />
                           <Input 
                              type="date" 
                              className="h-6 text-[8px] p-1 w-full bg-transparent border-none focus:bg-background"
                              value={formatDateValue(order.packingFinishDate || '')}
                              onChange={(e) => handleUpdatePlanning(order.displayId, { packingFinishDate: e.target.value }, order.isComponent, order.mainOrderId)}
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
                                onClick={() => router.push(`/order-planning/${order.id}`)}
                                className="bg-primary/5 font-bold text-primary"
                              >
                                <Rocket className="mr-2 h-4 w-4" />
                                Order Fulfillment Center
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleReleaseOrder(order)}
                                className={cn(
                                  "text-blue-600 focus:text-blue-600",
                                  !order.isMaterialsConfirmed && "opacity-50 grayscale cursor-not-allowed"
                                )}
                                disabled={!order.isMaterialsConfirmed}
                                title={!order.isMaterialsConfirmed ? "Materials must be confirmed in the Fulfillment Center first" : ""}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Release to Production {!order.isMaterialsConfirmed && "(Locked)"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setReqOrderId(order.id);
                                  setReqOrderNum(order.orderNumber);
                                  setIsReqDialogOpen(true);
                                }}
                              >
                                <Layers className="mr-2 h-4 w-4" />
                                Material Requisitions
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    const orderResponse = await fetch(`/api/marketing-orders/${order.id}`, {
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                      }
                                    });
                                    
                                    if (!orderResponse.ok) {
                                      throw new Error('Failed to fetch order details');
                                    }
                                    
                                    const orderDetails = await orderResponse.json();
                                    
                                    // First, fetch designer BOM items for this product code
                                    let designerBomItems: any[] = [];
                                    try {
                                      const designerBomResponse = await authenticatedFetch(`/api/designer-bom?productCode=${encodeURIComponent(orderDetails.productCode)}`);
                                      if (designerBomResponse.ok) {
                                        designerBomItems = await designerBomResponse.json();
                                        console.log('Designer BOM items fetched:', designerBomItems);
                                      }
                                    } catch (error) {
                                      console.warn('No designer BOM found for this product:', error);
                                    }
                                    
                                    // Then fetch existing requisitions
                                    let existingRequisitions: any[] = [];
                                    try {
                                      const response = await authenticatedFetch(`/api/requisitions?orderId=${order.id}`);
                                      if (response.ok) {
                                        existingRequisitions = await response.json();
                                      }
                                    } catch (error) {
                                      console.warn('No existing requisitions found:', error);
                                    }
                                    
                                    // Merge designer BOM items with existing requisitions
                                    // Designer BOM items take precedence, but we keep any custom items added by planners
                                    const mergedBomItems: any[] = [];
                                    const processedMaterialIds = new Set<string>();
                                    
                                    // Add designer BOM items first
                                    designerBomItems.forEach((item: any) => {
                                      mergedBomItems.push({
                                        id: item.id,
                                        materialName: item.materialName,
                                        materialId: item.materialId,
                                        quantityPerUnit: item.quantityPerUnit || 0,
                                        wastagePercentage: item.wastagePercentage || 5,
                                        unitOfMeasure: item.unitOfMeasure || 'M',
                                        type: item.type || 'Fabric',
                                        supplier: item.supplier || '',
                                        cost: item.cost || 0,
                                        materialImageUrl: item.materialImageUrl || '',
                                        comments: item.comments || '',
                                        fromDesigner: true // Mark as designer-created
                                      });
                                      if (item.materialId) {
                                        processedMaterialIds.add(item.materialId);
                                      }
                                    });
                                    
                                    // Add any custom items from requisitions that aren't in designer BOM
                                    existingRequisitions.forEach((item: any) => {
                                      if (!item.materialId || !processedMaterialIds.has(item.materialId)) {
                                        mergedBomItems.push({
                                          id: item.id,
                                          materialName: item.materialName,
                                          materialId: item.materialId,
                                          quantityPerUnit: item.quantityPerUnit || 0,
                                          wastagePercentage: item.wastagePercentage || 5,
                                          unitOfMeasure: item.unitOfMeasure,
                                          type: item.type || 'Fabric',
                                          supplier: item.supplier,
                                          cost: item.cost || 0,
                                          requestedQty: item.requestedQty || orderDetails.quantity || 1,
                                          calculatedTotal: item.calculatedTotal || 
                                            ((item.quantityPerUnit || 0) * (item.requestedQty || orderDetails.quantity || 1)) * (1 + ((item.wastagePercentage || 5) / 100)),
                                          calculatedCost: item.calculatedCost || 
                                            (((item.quantityPerUnit || 0) * (item.requestedQty || orderDetails.quantity || 1)) * (1 + ((item.wastagePercentage || 5) / 100))) * (item.cost || 0),
                                          fromDesigner: false // Mark as planner-added
                                        });
                                      }
                                    });
                                    
                                    if (mergedBomItems.length === 0) {
                                      toast({
                                        title: "No BOM Items",
                                        description: "No BOM items found. The designer hasn't created a BOM for this product yet. You can add items manually.",
                                        variant: "default"
                                      });
                                    } else {
                                      toast({
                                        title: "BOM Loaded",
                                        description: `Loaded ${designerBomItems.length} designer BOM items${existingRequisitions.length > 0 ? ` and ${existingRequisitions.length} existing requisitions` : ''}`,
                                        variant: "default"
                                      });
                                    }
                                    
                                    setBomOrderDetails(orderDetails);
                                    setBomItems(mergedBomItems);
                                    setIsBomDialogOpen(true);
                                  } catch (error: any) {
                                    console.error('Error fetching BOM details:', error);
                                    toast({ 
                                      title: "Error", 
                                      description: error.message || "Failed to load BOM details.",
                                      variant: "destructive" 
                                    });
                                  }
                                }}
                              >
                                <Layers className="mr-2 h-4 w-4" />
                                Modify & View BOM
                              </DropdownMenuItem>
                              {(user?.role === 'factory' || user?.role === 'marketing') && order.status === 'Placed Order' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setOrderToDelete(order.id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Order
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleExportOrderPDF(order)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Export PDF
                              </DropdownMenuItem>
                               <DropdownMenuSeparator />
                              {order.isMock && (
                                <DropdownMenuItem
                                  onClick={() => handleInitializeComponents(order)}
                                  className="text-blue-600 font-semibold"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Initialize Components
                                </DropdownMenuItem>
                              )}
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

                     {expandedOrders.map((order, idx) => {
                       const sewingStartStr = order.sewingStartDate;
                       const duration = Math.max(1, order.operationDays || 1);
                       const day = sewingStartStr ? new Date(sewingStartStr).getDate() : null;
                       const colorHue = 210 + (idx * 40) % 150;

                       return (
                         <div key={order.displayId} className="flex h-10 group/gantt relative hover:bg-muted/5 transition-colors z-10">
                           <div className="w-[180px] shrink-0 sticky left-0 bg-background/80 backdrop-blur-md z-20 border-r px-4 flex items-center text-[9px] truncate font-medium group-hover/gantt:text-primary transition-colors gap-1">
                             <span className="truncate flex-1">{order.orderNumber}</span>
                             {order.isComponent && <Badge className="text-[6px] p-0.5 px-1 h-3 bg-amber-50 text-amber-600 border-amber-200">{order.componentName}</Badge>}
                           </div>
                           <div className="flex-1 flex gap-0 relative">
                             <div className="w-[1100px] h-full" /> 
 
                             {day !== null && (
                               <div 
                                 className={`absolute h-7 top-1.5 cursor-move flex items-center px-2 text-[9px] truncate rounded shadow-sm transition-all group-hover/gantt:shadow-md ${interactingOrder === order.displayId ? 'ring-2 ring-primary ring-offset-1 z-30 scale-[1.01]' : 'z-10'}`}
                                 style={{ 
                                   left: `${(day - 1) * 35 + 4}px`, 
                                   width: `${duration * 35}px`,
                                   backgroundColor: `hsla(${colorHue}, 70%, 50%, 0.15)`,
                                   borderLeft: `3px solid hsla(${colorHue}, 70%, 50%, 0.8)`,
                                   color: `hsla(${colorHue}, 70%, 30%, 1)`
                                 }}
                                 onMouseDown={(e) => onInteractionStart(e, order as any, 'move')}
                               >
                                 <span className="font-bold flex-1 truncate">{duration}d - {order.isComponent ? order.componentName : order.productCode}</span>
                                 
                                 <div 
                                   className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-black/10 transition-colors rounded-r no-print"
                                   onMouseDown={(e) => {
                                     e.stopPropagation();
                                     onInteractionStart(e, order as any, 'resize');
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
            <DialogTitle className="flex items-center text-xl justify-between w-full pr-8">
              <div className="flex items-center">
                OB - {selectedOrder?.productName}
                {selectedComponent && <Badge className="ml-4 bg-amber-100 text-amber-700 border-amber-200">{selectedComponent}</Badge>}
              </div>
              <div className="text-xs font-normal text-muted-foreground flex gap-4">
                 <span>Code: {selectedOrder?.productCode}</span>
                 {selectedOrder?.orderNumber && <span>Order: {selectedOrder.orderNumber}</span>}
              </div>
            </DialogTitle>
            <DialogDescription>
              Operation bulletin for {selectedOrder?.productName} - {selectedComponent || 'All Components'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Seq</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Operation Name</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead className="text-right">SMV</TableHead>
                  <TableHead className="text-right">MP</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obItems
                  .filter(item => !selectedComponent || item.componentName === selectedComponent)
                  .map((item, index) => {
                    // Find actual index in real list for updates
                    const actualIndex = obItems.indexOf(item);
                    return (
                      <TableRow key={index} className="group hover:bg-primary/5 transition-colors">
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.sequence} 
                            onChange={(e) => updateOBItem(actualIndex, 'sequence', parseInt(e.target.value))}
                            className="h-8 text-center text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          {selectedOrder?.components && selectedOrder.components.length > 0 ? (
                            <select 
                              className="h-8 w-full text-xs rounded-md border border-input bg-transparent px-2"
                              value={item.componentName || ''}
                              onChange={(e) => updateOBItem(actualIndex, 'componentName', e.target.value)}
                            >
                              <option value="">(Select Part)</option>
                              {selectedOrder.components.map(c => (
                                <option key={c.id} value={c.componentName}>{c.componentName}</option>
                              ))}
                            </select>
                          ) : (
                            <Input 
                              value={item.componentName || ''} 
                              placeholder="Main"
                              onChange={(e) => updateOBItem(actualIndex, 'componentName', e.target.value)}
                              className="h-8 text-xs"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input 
                            value={item.operationName} 
                            placeholder="e.g. Front Pocket Join"
                            onChange={(e) => updateOBItem(actualIndex, 'operationName', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            value={item.machineType} 
                            placeholder="SNLS / Overlock"
                            onChange={(e) => updateOBItem(actualIndex, 'machineType', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={item.smv} 
                            onChange={(e) => updateOBItem(actualIndex, 'smv', parseFloat(e.target.value))}
                            className="h-8 text-right font-medium text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.manpower} 
                            onChange={(e) => updateOBItem(actualIndex, 'manpower', parseInt(e.target.value))}
                            className="h-8 text-right font-medium text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.operatorName ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] font-medium">
                                {item.operatorName}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 hover:bg-primary/10 text-primary"
                              onClick={() => {
                                setAssigningOp({ 
                                  sequence: item.sequence, 
                                  name: item.operationName,
                                  componentName: item.componentName
                                });
                                setIsAssignDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeOBRow(actualIndex)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
            <Button onClick={addOBRow} variant="outline" className="w-full mt-4 border-dashed border-2 bg-muted/20 hover:bg-muted/40 transition-colors">
              <Plus className="mr-2 h-4 w-4" /> Add Operation
            </Button>

            <div className="grid grid-cols-2 gap-4 mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {selectedComponent ? `SMV (${selectedComponent})` : 'Total Line SMV'}
                </span>
                <span className="font-bold text-2xl text-primary">
                  {(selectedComponent 
                    ? obItems.filter(i => i.componentName === selectedComponent).reduce((acc, i) => acc + (i.smv || 0), 0)
                    : obItems.reduce((acc, i) => acc + (i.smv || 0), 0)
                  ).toFixed(3)}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                   {selectedComponent ? `MP (${selectedComponent})` : 'Total Manpower'}
                </span>
                <span className="font-bold text-2xl text-primary">
                  {selectedComponent 
                    ? obItems.filter(i => i.componentName === selectedComponent).reduce((acc, i) => acc + (i.manpower || 0), 0)
                    : obItems.reduce((acc, i) => acc + (i.manpower || 0), 0)
                  }
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/20 border-t">
            <Button variant="outline" onClick={() => setIsOBDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOB} className="px-8 shadow-lg shadow-primary/20">Save Planning Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MaterialRequisitionsDialog 
        orderId={reqOrderId || ''}
        orderNumber={reqOrderNum}
        isOpen={isReqDialogOpen}
        onOpenChange={setIsReqDialogOpen}
      />

      <BOMModificationDialog
        isOpen={isBomDialogOpen}
        onOpenChange={setIsBomDialogOpen}
        orderDetails={bomOrderDetails || { id: '', orderNumber: '', productName: '', productCode: '', quantity: 0, items: [] }}
        initialBomItems={bomItems}
        onSave={(modifiedBomItems) => {
          // Handle saving modified BOM items
          console.log('Saving modified BOM items:', modifiedBomItems);
          toast({
            title: "Success",
            description: "BOM items updated successfully!"
          });
          setIsBomDialogOpen(false);
        }}
        onGeneratePDF={async (processedBomItems) => {
          try {
            // Prepare order details in the correct format
            const orderDetails = {
              id: bomOrderDetails?.id || '',
              orderNumber: bomOrderDetails?.orderNumber || '',
              productName: bomOrderDetails?.productName || '',
              productCode: bomOrderDetails?.productCode || '',
              quantity: bomOrderDetails?.quantity || 0,
              items: bomOrderDetails?.items || [],
              imageUrl: bomOrderDetails?.imageUrl
            };
            
            // Generate the PDF using the external function with the processed BOM items
            const pdfUrl = await generateBOMPDF(orderDetails, processedBomItems);
            
            // Download the PDF
            downloadBOMPDF(pdfUrl, `BOM_Report_${orderDetails.orderNumber || 'order'}.pdf`);
            
            toast({
              title: "Success",
              description: "BOM PDF generated and downloaded successfully!"
            });
            
            setIsBomDialogOpen(false);
          } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
              title: "Error",
              description: "Failed to generate PDF.",
              variant: "destructive"
            });
          }
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the marketing order and its items. This action cannot be undone and is only allowed for orders that have not yet entered production.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setOrderToDelete(null); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedOrder && assigningOp && (
        <OperatorAssignmentSidebar 
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          orderId={selectedOrder.id}
          operationCode={assigningOp.sequence.toString()}
          operationName={assigningOp.name}
          componentName={assigningOp.componentName}
          onAssigned={() => {
            // Refresh OB items to show the new operator
            openOBDialog(selectedOrder as any);
          }}
        />
      )}
    </div>
  );
}
