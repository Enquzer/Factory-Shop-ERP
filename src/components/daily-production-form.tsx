"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { MarketingOrderItem } from '@/lib/marketing-orders';

interface DailyProductionFormProps {
  orderId: string;
  items: MarketingOrderItem[];
  onStatusUpdate: () => void;
}

export function DailyProductionForm({ orderId, items, onStatusUpdate }: DailyProductionFormProps) {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, { quantity: number; status: string }>>({});
  
  // Initialize status updates with default values
  React.useEffect(() => {
    const initialUpdates: Record<string, { quantity: number; status: string }> = {};
    items.forEach(item => {
      const key = `${item.size}-${item.color}`;
      initialUpdates[key] = {
        quantity: item.quantity,
        status: 'In Progress'
      };
    });
    setStatusUpdates(initialUpdates);
  }, [items]);

  const handleQuantityChange = (size: string, color: string, quantity: number) => {
    const key = `${size}-${color}`;
    setStatusUpdates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        quantity: Math.max(0, quantity)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Submit each status update
      const promises = Object.entries(statusUpdates).map(async ([key, update]) => {
        const [size, color] = key.split('-');
        
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
            status: update.status
          }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update daily production status');
        }
        
        return response.json();
      });
      
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: "Daily production status updated successfully.",
      });
      
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Planned Quantity</TableHead>
                  <TableHead>Produced Quantity</TableHead>
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
                          value={update.quantity}
                          onChange={(e) => handleQuantityChange(item.size, item.color, parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
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
            
            <div className="flex justify-end">
              <Button type="submit">Update Daily Status</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}