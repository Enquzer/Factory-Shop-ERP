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

interface DailyProductionFormProps {
  orderId: string;
  items: MarketingOrderItem[];
  totalQuantity: number;
  onStatusUpdate: () => void;
  orderStatus?: MarketingOrderStatus; // Add order status prop
}

export function DailyProductionForm({ orderId, items, totalQuantity, onStatusUpdate, orderStatus }: DailyProductionFormProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'breakdown' | 'total'>('breakdown');
  const [totalProduced, setTotalProduced] = useState<number>(0);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { quantity: number; status: string }>>({});
  const [totalUpdate, setTotalUpdate] = useState<{ quantity: number; status: string; processStage?: string }>({ 
    quantity: 0, 
    status: 'In Progress' 
  });
  
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

  // Validate process stage dependency rules
  const validateProcessStage = (selectedStage: string): boolean => {
    // If no order status is provided, allow all stages
    if (!orderStatus) return true;
    
    // Define the process sequence
    const processSequence: MarketingOrderStatus[] = [
      'Placed Order',
      'Cutting', 
      'Production', 
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
                        <SelectItem value="Cutting">Cutting</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Packing">Packing</SelectItem>
                        <SelectItem value="Delivery">Delivery</SelectItem>
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
                        <SelectItem value="Cutting">Cutting</SelectItem>
                        <SelectItem value="Production">Production</SelectItem>
                        <SelectItem value="Packing">Packing</SelectItem>
                        <SelectItem value="Delivery">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Size</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Planned Quantity</TableHead>
                        <TableHead>Produced Quantity (Today)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const key = `${item.size}-${item.color}`;
                        const update = statusUpdates[key] || { quantity: 0, status: 'Pending' };
                        
                        return (
                          <TableRow key={key}>
                            <TableCell>{item.size}</TableCell>
                            <TableCell>{item.color}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={update.quantity}
                                onChange={(e) => handleQuantityChange(item.size, item.color, parseInt(e.target.value) || 0)}
                                className="w-24 border-accent focus:ring-accent"
                              />
                              <p className="text-xs text-muted-foreground">
                                Max: {item.quantity}
                              </p>
                            </TableCell>
                            <TableCell>
                              <select
                                value={update.status}
                                onChange={(e) => handleStatusChange(item.size, item.color, e.target.value)}
                                className="border rounded p-2"
                              >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                              </select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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