"use client";

import React, { useState, useEffect } from 'react';
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
import { VelocityProductionGrid } from './velocity-production-grid';

interface DailyProductionFormProps {
  orderId: string;
  items: MarketingOrderItem[];
  totalQuantity: number;
  onStatusUpdate: () => void;
  orderStatus?: MarketingOrderStatus; // Add order status prop
  userRole?: string;
  piecesPerSet?: number;
}

export function DailyProductionForm({ orderId, items, totalQuantity, onStatusUpdate, orderStatus, userRole, piecesPerSet = 1 }: DailyProductionFormProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'breakdown' | 'total'>('breakdown');
  const [totalProduced, setTotalProduced] = useState<number>(0);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { quantity: number; status: string }>>({});
  const [totalUpdate, setTotalUpdate] = useState<{ quantity: number; status: string; processStage?: string }>({ 
    quantity: 0, 
    status: 'In Progress' 
  });
  const [isVelocityGridSaving, setIsVelocityGridSaving] = useState(false);
  const [dailyProductionStatus, setDailyProductionStatus] = useState<any[]>([]);
  
  // Fetch total produced quantity
  useEffect(() => {
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
    
    fetchTotalProduced();
  }, [orderId, onStatusUpdate]);
  
  // Fetch daily production status for breakdown calculations
  useEffect(() => {
    const fetchDailyStatus = async () => {
      try {
        const response = await fetch(`/api/marketing-orders/daily-status?orderId=${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setDailyProductionStatus(data);
        }
      } catch (error) {
        console.error('Error fetching daily production status:', error);
      }
    };
    
    if (orderId) {
      fetchDailyStatus();
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
  }, [items, totalQuantity]);

  const handleQuantityChange = (size: string, color: string, quantity: number) => {
    const key = `${size}-${color}`;
    const newQuantity = Math.max(0, quantity);
    
    // Get current total for this item from database
    // For now, we'll just validate against the planned quantity
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
    
    // Validate that total quantity doesn't exceed order quantity
    if (newQuantity > totalQuantity) {
      toast({
        title: "Validation Error",
        description: `Total quantity cannot exceed order quantity of ${totalQuantity}`,
        variant: "destructive",
      });
      return;
    }
    
    // Also validate that it doesn't exceed remaining quantity
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
    setTotalUpdate(prev => ({
      ...prev,
      status
    }));
  };

  const handleProcessStageChange = (stage: string) => {
    setTotalUpdate(prev => ({
      ...prev,
      processStage: stage
    }));
  };

  const handleModeChange = (value: string) => {
    setMode(value as 'breakdown' | 'total');
  };
  
  // Calculate current department total for an item based on daily production status
  const getCurrentDepartmentTotal = (size: string, color: string) => {
    return dailyProductionStatus
      .filter(status => status.size === size && status.color === color)
      .reduce((sum, status) => sum + status.quantity, 0);
  };

  // Validate process stage dependency rules
  const validateProcessStage = (selectedStage: string): boolean => {
    // If no order status is provided, allow all stages
    if (!orderStatus) return true;
    
    // Define the process sequence
    const processSequence: MarketingOrderStatus[] = [
      'Placed Order',
      'Planning',
      'Sample Making',
      'Cutting', 
      'Sewing', 
      'Finishing',
      'Quality Inspection',
      'Packing', 
      'Delivery'
    ];
    
    // Find the index of the selected stage and current order status
    const selectedStageIndex = processSequence.indexOf(selectedStage as MarketingOrderStatus);
    const currentOrderStatusIndex = processSequence.indexOf(orderStatus);
    
    // If selected stage is the current order status, it's always allowed
    if (selectedStageIndex === currentOrderStatusIndex) return true;
    
    // If selected stage is before current order status, it's allowed (partial progress)
    if (selectedStageIndex < currentOrderStatusIndex) return true;
    
    // If selected stage is the next stage after current, it's allowed
    if (selectedStageIndex === currentOrderStatusIndex + 1) return true;
    
    // If selected stage is more than one step ahead, check if previous stage has progress
    if (selectedStageIndex > currentOrderStatusIndex + 1) {
      // For now, we'll allow it but in a real implementation, we'd check if there's
      // recorded progress in the intermediate stages
      return true;
    }
    
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (mode === 'total') {
        // Validate that process stage is selected
        if (!totalUpdate.processStage) {
          toast({
            title: "Validation Error",
            description: "Please select a production process stage.",
            variant: "destructive",
          });
          return;
        }
        
        // Validate process stage dependency
        if (!validateProcessStage(totalUpdate.processStage)) {
          toast({
            title: "Validation Error",
            description: `Cannot record progress for ${totalUpdate.processStage} stage. Please ensure previous stages have been started.`,
            variant: "destructive",
          });
          return;
        }
        
        // Validate that total quantity doesn't exceed order quantity
        if (totalUpdate.quantity > totalQuantity) {
          toast({
            title: "Validation Error",
            description: `Total quantity cannot exceed order quantity of ${totalQuantity}`,
            variant: "destructive",
          });
          return;
        }
        
        // Validate that it doesn't exceed remaining quantity
        const remaining = totalQuantity - totalProduced;
        if (totalUpdate.quantity > remaining) {
          toast({
            title: "Validation Error",
            description: `Total quantity cannot exceed remaining quantity of ${remaining}`,
            variant: "destructive",
          });
          return;
        }
        
        // Submit total quantity update
        const response = await fetch('/api/marketing-orders/daily-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            date,
            quantity: totalUpdate.quantity,
            status: totalUpdate.status,
            processStage: totalUpdate.processStage, // Add process stage to the request
            isTotalUpdate: true
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update daily production status');
        }
      } else {
        // For breakdown mode, validate that process stage is selected
        if (!totalUpdate.processStage) {
          toast({
            title: "Validation Error",
            description: "Please select a production process stage.",
            variant: "destructive",
          });
          return;
        }
        
        // Validate process stage dependency
        if (!validateProcessStage(totalUpdate.processStage)) {
          toast({
            title: "Validation Error",
            description: `Cannot record progress for ${totalUpdate.processStage} stage. Please ensure previous stages have been started.`,
            variant: "destructive",
          });
          return;
        }
        
        // For breakdown mode, validate and submit each item
        // First calculate total of all breakdown quantities
        let breakdownTotal = 0;
        for (const [key, update] of Object.entries(statusUpdates)) {
          breakdownTotal += update.quantity;
        }
        
        // Validate that breakdown total doesn't exceed remaining quantity
        const remaining = totalQuantity - totalProduced;
        if (breakdownTotal > remaining) {
          toast({
            title: "Validation Error",
            description: `Total breakdown quantity cannot exceed remaining quantity of ${remaining}`,
            variant: "destructive",
          });
          return;
        }
        
        // Validate each item quantity
        for (const [key, update] of Object.entries(statusUpdates)) {
          const [size, color] = key.split('-');
          const item = items.find(i => i.size === size && i.color === color);
          
          if (item && update.quantity > item.quantity) {
            toast({
              title: "Validation Error",
              description: `Quantity for ${size} ${color} cannot exceed planned quantity of ${item.quantity}`,
              variant: "destructive",
            });
            return;
          }
        }
        
        // Submit each status update
        const promises = Object.entries(statusUpdates).map(async ([key, update]) => {
          const [size, color] = key.split('-');
          
          // Only submit if quantity > 0
          if (update.quantity > 0) {
            const response = await fetch('/api/marketing-orders/daily-status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId,
                date,
                size,
                color,
                quantity: update.quantity,
                status: update.status,
                processStage: totalUpdate.processStage, // Add process stage to the request
                isTotalUpdate: false
              }),
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to update daily production status');
            }
            
            return response.json();
          }
        });
        
        // Filter out undefined promises (for items with 0 quantity)
        await Promise.all(promises.filter(Boolean));
      }
      
      toast({
        title: "Success",
        description: "Daily production status updated successfully.",
      });
      
      // Refresh total produced quantity
      onStatusUpdate();
    } catch (error: any) {
      console.error('Error updating daily production status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update daily production status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Production Status</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="border-accent focus:ring-accent"
                />
              </div>
              <div>
                <Label htmlFor="mode">Mode</Label>
                <Select value={mode} onValueChange={handleModeChange}>
                  <SelectTrigger className="w-full border-accent focus:ring-accent">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakdown">Size/Color Breakdown</SelectItem>
                    <SelectItem value="total">Total Quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-blue-50 p-3 rounded-md">
                <div className="text-sm font-medium">Placed vs Produced</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Placed: {totalQuantity} units
                </div>
                <div className="text-xs text-muted-foreground">
                  Produced: {totalProduced} units
                </div>
                <div className="text-xs font-medium mt-1">
                  Remaining: {totalQuantity - totalProduced} units
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Based on order total vs produced
                </div>
              </div>
            </div>
            
            {mode === 'total' ? (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Total Production Update</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="processStage">Process Stage *</Label>
                    <Select value={totalUpdate.processStage || ""} onValueChange={handleProcessStageChange}>
                      <SelectTrigger className="w-full border-accent focus:ring-accent">
                        <SelectValue placeholder="Select process stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {(!userRole || userRole === 'factory' || userRole === 'planning') && <SelectItem value="Planning">Planning</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'sample_maker') && <SelectItem value="Sample Making">Sample Making</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'cutting') && <SelectItem value="Cutting">Cutting</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'sewing' || userRole === 'finishing') && <SelectItem value="Sewing">Sewing</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'finishing' || userRole === 'packing') && <SelectItem value="Finishing">Finishing</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'quality_inspection' || userRole === 'packing') && <SelectItem value="Quality Inspection">Quality Inspection</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'packing') && <SelectItem value="Packing">Packing</SelectItem>}
                        {(!userRole || userRole === 'factory') && <SelectItem value="Delivery">Delivery</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="totalQuantity">Produced Quantity (Today)</Label>
                    <Input
                      id="totalQuantity"
                      type="number"
                      min="0"
                      max={totalQuantity - totalProduced}
                      value={totalUpdate.quantity}
                      onChange={(e) => handleTotalQuantityChange(parseInt(e.target.value) || 0)}
                      className="w-full border-accent focus:ring-accent"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max: {totalQuantity - totalProduced} units
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="totalStatus">Status</Label>
                    <select
                      id="totalStatus"
                      value={totalUpdate.status}
                      onChange={(e) => handleTotalStatusChange(e.target.value)}
                      className="border rounded p-2 w-full"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="border rounded-lg p-4 mb-4">
                  <h3 className="font-medium mb-3">Size/Color Breakdown Production Update</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter production quantities for each size and color combination
                  </p>
                  {/* Process Stage Selection for Size/Color Breakdown */}
                  <div className="mb-4">
                    <Label htmlFor="processStageBreakdown">Process Stage *</Label>
                    <Select value={totalUpdate.processStage || ""} onValueChange={handleProcessStageChange}>
                      <SelectTrigger className="w-full border-accent focus:ring-accent">
                        <SelectValue placeholder="Select process stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {(!userRole || userRole === 'factory' || userRole === 'planning') && <SelectItem value="Planning">Planning</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'sample_maker') && <SelectItem value="Sample Making">Sample Making</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'cutting') && <SelectItem value="Cutting">Cutting</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'sewing' || userRole === 'finishing') && <SelectItem value="Sewing">Sewing</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'finishing' || userRole === 'packing') && <SelectItem value="Finishing">Finishing</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'quality_inspection' || userRole === 'packing') && <SelectItem value="Quality Inspection">Quality Inspection</SelectItem>}
                        {(!userRole || userRole === 'factory' || userRole === 'packing') && <SelectItem value="Packing">Packing</SelectItem>}
                        {(!userRole || userRole === 'factory') && <SelectItem value="Delivery">Delivery</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  {totalUpdate.processStage && (
                    <VelocityProductionGrid
                      orderId={orderId}
                      orderNumber={orderId}
                      styleCode="G-90"
                      totalOrderQty={totalQuantity}
                      items={items.map(item => ({
                        id: `${item.size}-${item.color}`,
                        size: item.size,
                        color: item.color,
                        plannedQuantity: item.quantity,
                        previousDepartmentTotal: item.quantity, // For now, using planned quantity as previous department total
                        currentDepartmentTotal: getCurrentDepartmentTotal(item.size, item.color)
                      }))}
                      userRole={userRole as any || 'cutting'}
                      onSave={(updates) => {
                        setIsVelocityGridSaving(true);
                        
                        // Update the statusUpdates state with new values
                        const newStatusUpdates: Record<string, { quantity: number; status: string }> = {};
                        updates.forEach(update => {
                          const [size, color] = update.id.split('-');
                          const key = `${size}-${color}`;
                          newStatusUpdates[key] = {
                            quantity: update.quantity,
                            status: statusUpdates[key]?.status || 'In Progress'
                          };
                        });
                        
                        setStatusUpdates(newStatusUpdates);
                        
                        // Simulate API call delay then reset saving state
                        setTimeout(() => {
                          setIsVelocityGridSaving(false);
                        }, 500);
                      }}
                      isLoading={isVelocityGridSaving}
                    />
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button type="submit">Update Daily Status</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}