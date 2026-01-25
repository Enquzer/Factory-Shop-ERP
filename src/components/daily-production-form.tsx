"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { MarketingOrderItem, MarketingOrderStatus } from '@/lib/marketing-orders';
import { Badge } from '@/components/ui/badge';
import { VelocityProductionGrid } from './velocity-production-grid';

interface DailyProductionFormProps {
  orderId: string;
  items: MarketingOrderItem[];
  totalQuantity: number;
  onStatusUpdate: () => void;
  orderStatus?: MarketingOrderStatus; // Add order status prop
  userRole?: string;
  piecesPerSet?: number;
  plannedOutputPerDay?: number;
  components?: any[];
}

export function DailyProductionForm({ orderId, items, totalQuantity, onStatusUpdate, orderStatus, userRole, piecesPerSet = 1, plannedOutputPerDay, components }: DailyProductionFormProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'breakdown' | 'total'>('breakdown');
  const [totalProduced, setTotalProduced] = useState<number>(0);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { quantity: number; status: string }>>({});
  const [totalUpdate, setTotalUpdate] = useState<{ quantity: number; status: string; processStage?: string }>({ 
    quantity: 0, 
    status: 'In Progress' 
  });
  const [isSaving, setIsSaving] = useState(false);
  const [dailyProductionStatus, setDailyProductionStatus] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Fetch total produced quantity
  const fetchTotalProduced = async () => {
    try {
      const response = await fetch(`/api/marketing-orders/total-produced?orderId=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setTotalProduced(data.totalProduced || 0);
      }
    } catch (error) {
      console.error('Error fetching total produced quantity:', error);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/marketing-orders/daily-status?orderId=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
        setDailyProductionStatus(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  useEffect(() => {
    if (orderId) {
      fetchTotalProduced();
      fetchHistory();
    }
  }, [orderId]);
  
  // Initialize status updates with default values
  useEffect(() => {
    const initialUpdates: Record<string, { quantity: number; status: string }> = {};
    items.forEach(item => {
      const key = `${item.size}-${item.color}`;
      initialUpdates[key] = {
        quantity: 0,
        status: 'In Progress'
      };
    });
    setStatusUpdates(initialUpdates);
    
    // Initialize total update with 0 quantity
    setTotalUpdate({
      quantity: 0,
      status: 'In Progress'
    });
  }, [items]);

  // Auto-select process stage based on user role
  useEffect(() => {
    if (!userRole) return;
    const roleToStage: Record<string, string> = {
      'planning': 'Planning',
      'sample_maker': 'Sample Making',
      'cutting': 'Cutting',
      'sewing': 'Sewing',
      'finishing': 'Finishing',
      'packing': 'Packing',
    };
    if (roleToStage[userRole]) {
       setTotalUpdate(prev => ({ ...prev, processStage: roleToStage[userRole] }));
    }
  }, [userRole]);

  const handleQuantityChange = (size: string, color: string, quantity: number) => {
    const key = `${size}-${color}`;
    const newQuantity = Math.max(0, quantity);
    
    const item = items.find(i => i.size === size && i.color === color);
    if (item && newQuantity > item.quantity) {
      toast({
        title: "Validation Error",
        description: `Quantity cannot exceed planned quantity of ${item.quantity} for ${size} ${color}`,
        variant: "destructive",
      });
      return;
    }
    
    setStatusUpdates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantity: newQuantity
      }
    }));
  };

  const handleStatusChange = (size: string, color: string, status: string) => {
    const key = `${size}-${color}`;
    setStatusUpdates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        status
      }
    }));
  };

  const handleTotalQuantityChange = (quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    
    if (newQuantity > totalQuantity) {
      toast({
        title: "Validation Error",
        description: `Total quantity cannot exceed order quantity of ${totalQuantity}`,
        variant: "destructive",
      });
      return;
    }
    
    if (newQuantity > (totalQuantity - totalProduced)) {
      toast({
        title: "Validation Error",
        description: `Total quantity cannot exceed remaining quantity of ${totalQuantity - totalProduced}`,
        variant: "destructive",
      });
      return;
    }
    
    setTotalUpdate(prev => ({
      ...prev,
      quantity: newQuantity
    }));
  };

  const handleTotalStatusChange = (status: string) => {
    setTotalUpdate(prev => ({ ...prev, status }));
  };

  const handleProcessStageChange = (stage: string) => {
    setTotalUpdate(prev => ({ ...prev, processStage: stage }));
  };

  const handleModeChange = (value: string) => {
    setMode(value as 'breakdown' | 'total');
  };
  
  const getHistoryTotal = (stage: string, size: string, color: string, component?: string) => {
    return history
      .filter(entry => 
        entry.processStage === stage && 
        entry.size === size && 
        entry.color === color && 
        (!component || entry.componentName === component)
      )
      .reduce((sum, entry) => sum + entry.quantity, 0);
  };

  const getCurrentDepartmentTotal = (size: string, color: string) => {
    return dailyProductionStatus
      .filter(status => status.size === size && status.color === color)
      .reduce((sum, status) => sum + status.quantity, 0);
  };

  const validateProcessStage = (selectedStage: string): boolean => {
    if (!orderStatus) return true;
    const processSequence: MarketingOrderStatus[] = [
      'Placed Order', 'Planning', 'Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection', 'Packing', 'Delivery'
    ];
    const selectedStageIndex = processSequence.indexOf(selectedStage as MarketingOrderStatus);
    const currentOrderStatusIndex = processSequence.indexOf(orderStatus);
    if (selectedStageIndex <= currentOrderStatusIndex + 1) return true;
    return true; // Simplified for now
  };

  const handleNotifyQC = async () => {
    try {
      // Determine the inspection stage based on current order status
      let inspectionStage = 'Inline-Sewing';
      if (orderStatus === 'Sample Making') inspectionStage = 'Sample';
      else if (orderStatus === 'Cutting') inspectionStage = 'Inline-Cutting';
      else if (orderStatus === 'Sewing') inspectionStage = 'Inline-Sewing';
      else if (['Finishing', 'Quality Inspection', 'Packing'].includes(orderStatus || '')) inspectionStage = 'Final';

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/marketing-orders/${orderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          qualityInspectionStatus: 'Pending',
          qualityInspectionStage: inspectionStage
        })
      });
      
      if (response.ok) {
        toast({
          title: "QC Notified",
          description: `Quality Control department has been notified for ${inspectionStage} inspection.`,
        });
        onStatusUpdate();
      } else {
        throw new Error('Failed to notify QC');
      }
    } catch (error) {
      console.error('Error notifying QC:', error);
      toast({
        title: "Error",
        description: "Failed to notify QC. Please try again.",
        variant: "destructive",
      });
    }
  };

  // State for component selection (Sewing stage)
  const [selectedCompId, setSelectedCompId] = useState<string>("");

  useEffect(() => {
    const isSewing = totalUpdate.processStage === 'Sewing' || userRole === 'sewing';
    if (isSewing && components && components.length > 0) {
      // Only set if not already set or override if needed. 
      // For simplicity, just ensure a value is selected if we are in sewing mode.
      setSelectedCompId(prev => prev || components[0].componentName);
    }
  }, [userRole, components, totalUpdate.processStage]);

  const performSubmit = async (updatesObject?: Record<string, { quantity: number; status: string }>) => {
    setIsSaving(true);
    try {
      const targetUpdates = updatesObject || statusUpdates;
      const currentStage = totalUpdate.processStage;

      if (!currentStage) {
        toast({ title: "Authorization Error", description: "Your role is not authorized for production entry.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      
      if (mode === 'total') {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch('/api/marketing-orders/daily-status', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orderId,
            date,
            quantity: totalUpdate.quantity,
            status: totalUpdate.status,
            processStage: currentStage,
            componentName: ((currentStage === 'Sewing' || userRole === 'sewing') && components && components.length > 1) ? selectedCompId : null,
            isTotalUpdate: true
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || error.error || 'Failed to update daily production status');
        }
      } else {
        let breakdownTotal = 0;
        for (const update of Object.values(targetUpdates)) {
          breakdownTotal += update.quantity;
        }
        
        if (breakdownTotal === 0) {
          toast({ title: "No Data", description: "Please enter production quantities before saving.", variant: "destructive" });
          setIsSaving(false);
          return;
        }

        const promises = Object.entries(targetUpdates).map(async ([key, update]) => {
          const [size, color] = key.split('-');
          if (update.quantity > 0) {
            const token = localStorage.getItem('authToken');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/marketing-orders/daily-status', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                orderId,
                date,
                size,
                color,
                quantity: update.quantity,
                status: update.status,
                processStage: currentStage,
                componentName: ((currentStage === 'Sewing' || userRole === 'sewing') && components && components.length > 1) ? selectedCompId : null,
                isTotalUpdate: false
              }),
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.details || error.error || 'Failed to update daily production status');
            }
            return response.json();
          }
        });
        
        await Promise.all(promises.filter(Boolean));
      }
      
      toast({ title: "Success", description: "Daily production status updated successfully." });
      
      if (mode === 'total') {
        setTotalUpdate(prev => ({ ...prev, quantity: 0 }));
      } else {
        const resetUpdates: Record<string, { quantity: number; status: string }> = {};
        items.forEach(item => {
          resetUpdates[`${item.size}-${item.color}`] = { quantity: 0, status: 'In Progress' };
        });
        setStatusUpdates(resetUpdates);
      }

      fetchTotalProduced();
      fetchHistory();
      onStatusUpdate();
    } catch (error: any) {
      console.error('Error updating daily production status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update daily production status.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSubmit();
  };

  // Calculate Production Summary (Sets + Stray Components)
  const productionSummary = useMemo(() => {
    if (!components || components.length <= 1) {
      // For single component products, just return the sets based on sewing history
      const sets: any[] = [];
      const grouped: Record<string, number> = {};
      
      history.forEach(entry => {
        if (entry.processStage !== 'Sewing' || entry.isTotalUpdate) return;
        const key = `${entry.color}-${entry.size}`;
        grouped[key] = (grouped[key] || 0) + entry.quantity;
      });

      Object.entries(grouped).forEach(([key, qty]) => {
        const [color, size] = key.split('-');
        if (qty > 0) sets.push({ color, size, quantity: qty });
      });

      return { sets, strays: [] };
    }

    const grouped: Record<string, Record<string, number>> = {};
    
    // Process history: Only look at Sewing stage for component completion
    history.forEach(entry => {
      if (entry.processStage !== 'Sewing' || entry.isTotalUpdate) return;
      
      const key = `${entry.color}-${entry.size}`;
      if (!grouped[key]) grouped[key] = {};
      
      const compName = entry.componentName || 'General';
      grouped[key][compName] = (grouped[key][compName] || 0) + entry.quantity;
    });

    const sets: any[] = [];
    const strays: any[] = [];

    Object.entries(grouped).forEach(([variantKey, componentQtys]) => {
      const [color, size] = variantKey.split('-');
      
      // 1. Calculate matching sets (intersection of all components)
      let minSets = Infinity;
      components.forEach(comp => {
        const qty = componentQtys[comp.componentName] || 0;
        minSets = Math.min(minSets, qty);
      });
      if (minSets === Infinity) minSets = 0;

      if (minSets > 0) {
        sets.push({
          color,
          size,
          quantity: minSets,
          details: components.map(c => `${c.componentName}: ${componentQtys[c.componentName] || 0}`).join(', ')
        });
      }

      // 2. Calculate Stray/WIP Components (Sewn but not yet matched into a set)
      components.forEach(comp => {
        const totalSewn = componentQtys[comp.componentName] || 0;
        const strayQty = totalSewn - minSets;
        if (strayQty > 0) {
          strays.push({ color, size, component: comp.componentName, quantity: strayQty });
        }
      });
    });

    return { sets, strays };
  }, [history, components]);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md">
        <CardHeader className="bg-primary/5 rounded-t-xl">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span>Production Entry</span>
               <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase text-[10px] font-bold">
                  Stage: {totalUpdate.processStage || userRole}
               </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleNotifyQC}
              >
                Notify QC for Inspection
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Production Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="border-gray-200"
                  />
                </div>
                
                {/* Component Selector (Only for Sewing if multiple components exist) */}
                {(totalUpdate.processStage === 'Sewing' || userRole === 'sewing') && components && components.length > 1 ? (
                   <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Component *</Label>
                      <Select value={selectedCompId} onValueChange={setSelectedCompId}>
                        <SelectTrigger className="w-full border-blue-200 bg-blue-50/30">
                          <SelectValue placeholder="Select component" />
                        </SelectTrigger>
                        <SelectContent>
                          {components.map((comp) => (
                             <SelectItem key={comp.id || comp.componentName} value={comp.componentName}>
                               {comp.componentName}
                             </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Progression</Label>
                    <div className="h-10 flex items-center px-4 bg-gray-50 border border-dashed rounded-md text-sm text-muted-foreground">
                      {userRole === 'packing' ? 'Unified Product Tracking' : 'Single Component Tracking'}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Balance Units</div>
                    <div className="text-2xl font-black text-blue-900">{totalQuantity - totalProduced}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Total: {totalQuantity}</div>
                    <div className="text-[10px] text-green-600 font-medium">Recorded: {totalProduced}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-b pb-4">
                <Button 
                  type="button" 
                  variant={mode === 'breakdown' ? 'default' : 'ghost'} 
                  onClick={() => handleModeChange('breakdown')}
                  className="rounded-full px-6 h-8 text-xs"
                >
                  Size/Color Breakdown
                </Button>
                <Button 
                  type="button" 
                  variant={mode === 'total' ? 'default' : 'ghost'} 
                  onClick={() => handleModeChange('total')}
                  className="rounded-full px-6 h-8 text-xs"
                >
                  Total Quantity Only
                </Button>
              </div>
              
              {mode === 'total' ? (
                <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="totalQuantity">Produced Today</Label>
                      <Input
                        id="totalQuantity"
                        type="number"
                        min="0"
                        value={totalUpdate.quantity || ''}
                        onChange={(e) => handleTotalQuantityChange(parseInt(e.target.value) || 0)}
                        placeholder="Enter units..."
                        className="text-lg font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalStatus">Status</Label>
                      <Select value={totalUpdate.status} onValueChange={handleTotalStatusChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="On Hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" disabled={isSaving} className="w-full h-12 text-md font-bold">
                    {isSaving ? 'Processing...' : 'FINISHED UPDATING STATUS'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                    <VelocityProductionGrid
                      orderId={orderId}
                      orderNumber={orderId}
                      styleCode={items[0]?.color || 'Standard'}
                      totalOrderQty={totalQuantity}
                      componentName={userRole === 'sewing' ? selectedCompId : undefined}
                      items={items.map(item => {
                        const previousStage = userRole === 'sewing' ? 'Cutting' : 'Planning';
                        const currentStage = totalUpdate.processStage || 'Sewing';
                        
                        return {
                          id: `${item.size}-${item.color}`,
                          size: item.size,
                          color: item.color,
                          plannedQuantity: item.quantity,
                          previousDepartmentTotal: getHistoryTotal(previousStage, item.size, item.color, (userRole === 'sewing' || userRole === 'cutting') ? selectedCompId : undefined),
                          currentDepartmentTotal: getHistoryTotal(currentStage, item.size, item.color, (userRole === 'sewing' || userRole === 'cutting') ? selectedCompId : undefined)
                        };
                      })}
                      userRole={(userRole as any) || 'sewing'}
                      plannedOutputPerDay={plannedOutputPerDay}
                      onSave={(updates) => {
                        const newStatusUpdates: Record<string, { quantity: number; status: string }> = {};
                        updates.forEach(update => {
                          const [size, color] = update.id.split('-');
                          newStatusUpdates[`${size}-${color}`] = {
                            quantity: update.quantity,
                            status: statusUpdates[`${size}-${color}`]?.status || 'In Progress'
                          };
                        });
                        performSubmit(newStatusUpdates);
                      }}
                      isLoading={isSaving}
                    />
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Production Summary Cards */}
      {(productionSummary.sets.length > 0 || productionSummary.strays.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Full Sets Ready */}
          {productionSummary.sets.length > 0 && (
            <Card className="border-none shadow-md overflow-hidden bg-green-50/30">
              <CardHeader className="bg-green-100/50 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-800">
                  <div className="w-1.5 h-4 bg-green-600 rounded-full" />
                  FULL SETS READY TO PACK
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-green-50/50">
                    <TableRow>
                      <TableHead className="py-2 text-[10px] uppercase font-bold text-green-800">Size/Color</TableHead>
                      <TableHead className="py-2 text-right text-[10px] uppercase font-bold text-green-800">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionSummary.sets.map((set: any, idx: number) => (
                      <TableRow key={idx} className="bg-white/50 border-green-100">
                        <TableCell className="py-2 font-mono text-[10px] font-bold">{set.color} / {set.size}</TableCell>
                        <TableCell className="py-2 text-right">
                          <Badge className="bg-green-600 text-white text-[10px] px-2 py-0">
                            {set.quantity} Sets
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Stray/WIP Components */}
          {productionSummary.strays.length > 0 && (
            <Card className="border-none shadow-md overflow-hidden bg-amber-50/30">
              <CardHeader className="bg-amber-100/50 border-b py-3 px-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800">
                  <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
                  STRAY / WIP COMPONENTS (UNMATCHED)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-amber-50/50">
                    <TableRow>
                      <TableHead className="py-2 text-[10px] uppercase font-bold text-amber-800">Size/Color</TableHead>
                      <TableHead className="py-2 text-[10px] uppercase font-bold text-amber-800">Component</TableHead>
                      <TableHead className="py-2 text-right text-[10px] uppercase font-bold text-amber-800">Stray Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionSummary.strays.map((stray: any, idx: number) => (
                      <TableRow key={idx} className="bg-white/50 border-amber-100">
                        <TableCell className="py-2 font-mono text-[10px] font-bold">{stray.color} / {stray.size}</TableCell>
                        <TableCell className="py-2">
                           <Badge variant="outline" className="text-[9px] font-bold border-amber-200 text-amber-700 bg-white">
                             {stray.component}
                           </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <span className="text-amber-700 font-bold text-xs">{stray.quantity} pcs</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Sewing History Section */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full" />
            Sewing Output History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="text-[11px] uppercase font-bold">Date</TableHead>
                <TableHead className="text-[11px] uppercase font-bold">Process</TableHead>
                <TableHead className="text-[11px] uppercase font-bold">Component</TableHead>
                <TableHead className="text-[11px] uppercase font-bold">Size/Color</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold">Quantity</TableHead>
                <TableHead className="text-[11px] uppercase font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground animate-pulse">Loading history...</TableCell>
                </TableRow>
              ) : history.length > 0 ? (
                history.map((entry, idx) => (
                  <TableRow key={idx} className="group hover:bg-gray-50/50">
                    <TableCell className="font-medium text-xs">{entry.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold bg-white">{entry.processStage || 'Sewing'}</Badge>
                    </TableCell>
                    <TableCell>
                      {entry.componentName ? (
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border-blue-100">
                          {entry.componentName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">
                          {entry.processStage === 'Sewing' ? 'Main / General' : 'N/A'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.isTotalUpdate ? (
                        <span className="text-muted-foreground italic text-xs">Total Update</span>
                      ) : (
                        <span className="font-mono text-[10px]">{entry.color} / {entry.size}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600 text-xs">{entry.quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          entry.status === 'Completed' ? 'bg-green-500' : 
                          entry.status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-[10px]">{entry.status}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">No production history recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
