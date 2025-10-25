"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';

interface GanttTask {
  id: string;
  name: string;
  productCode: string;
  imageUrl?: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  items: {
    size: string;
    color: string;
    quantity: number;
    progress: number;
  }[];
}

interface GanttChartProps {
  orders: any[]; // MarketingOrder[]
}

export function GanttChart({ orders }: GanttChartProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [timeframe, setTimeframe] = useState<{ start: Date; end: Date }>({ 
    start: new Date(), 
    end: new Date() 
  });

  useEffect(() => {
    if (orders && orders.length > 0) {
      // Convert orders to Gantt tasks
      const ganttTasks: GanttTask[] = orders.map(order => {
        // Calculate progress based on status
        let progress = 0;
        let status = order.status;
        
        switch (order.status) {
          case 'Placed Order':
            progress = 10;
            break;
          case 'Cutting':
            progress = 30;
            break;
          case 'Production':
            progress = 50;
            break;
          case 'Packing':
            progress = 70;
            break;
          case 'Delivery':
            progress = 90;
            break;
          case 'Completed':
            progress = 100;
            status = 'Completed';
            break;
          default:
            progress = 0;
        }
        
        // Calculate start and end dates
        const startDate = order.orderPlacementDate 
          ? new Date(order.orderPlacementDate) 
          : new Date(order.createdAt);
          
        const endDate = order.plannedDeliveryDate 
          ? new Date(order.plannedDeliveryDate) 
          : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // Default to 14 days
        
        // Calculate item progress (simplified)
        const itemsWithProgress = order.items.map((item: any) => ({
          ...item,
          progress: Math.min(100, progress + Math.floor(Math.random() * 20) - 10) // Add some variation
        }));
        
        return {
          id: order.id,
          name: order.productName,
          productCode: order.productCode,
          imageUrl: order.imageUrl,
          startDate,
          endDate,
          progress,
          status,
          items: itemsWithProgress
        };
      });
      
      setTasks(ganttTasks);
      
      // Calculate overall timeframe
      if (ganttTasks.length > 0) {
        const startDates = ganttTasks.map(task => task.startDate);
        const endDates = ganttTasks.map(task => task.endDate);
        const minStart = new Date(Math.min(...startDates.map(date => date.getTime())));
        const maxEnd = new Date(Math.max(...endDates.map(date => date.getTime())));
        
        setTimeframe({ start: minStart, end: maxEnd });
      }
    }
  }, [orders]);

  // Calculate the number of days in the timeframe
  const getTotalDays = () => {
    return Math.ceil((timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calculate position and width for a task
  const getTaskPosition = (startDate: Date, endDate: Date) => {
    const totalDays = getTotalDays();
    const startOffset = Math.ceil((startDate.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  // Generate date headers
  const generateDateHeaders = () => {
    const headers = [];
    const totalDays = getTotalDays();
    const daysToShow = Math.min(totalDays, 30); // Limit to 30 days for better display
    
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(timeframe.start);
      date.setDate(timeframe.start.getDate() + i);
      
      headers.push(
        <div 
          key={i} 
          className="text-xs text-center border-r last:border-r-0"
          style={{ width: `${100 / daysToShow}%` }}
        >
          {date.getDate()}
          <div className="text-xs text-gray-500">
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>
      );
    }
    
    return headers;
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Production Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">No orders available to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Date Headers */}
          <div className="flex border-b">
            <div className="w-48 flex-shrink-0"></div>
            {generateDateHeaders()}
          </div>
          
          {/* Tasks */}
          <div className="space-y-4 py-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center">
                {/* Task Info */}
                <div className="w-48 flex-shrink-0 pr-4">
                  <div className="flex items-center space-x-2">
                    {task.imageUrl ? (
                      <div className="relative h-8 w-8 rounded-md overflow-hidden">
                        <Image 
                          src={task.imageUrl} 
                          alt={task.name} 
                          fill 
                          sizes="32px"
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">No Image</span>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{task.productCode}</div>
                      <div className="text-xs text-gray-500 truncate">{task.name}</div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <Badge 
                      variant={task.status === 'Completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>
                
                {/* Timeline Bar */}
                <div className="flex-1 relative h-12">
                  <div 
                    className="absolute top-1/2 h-6 rounded-md bg-blue-200 border border-blue-300 flex items-center"
                    style={getTaskPosition(task.startDate, task.endDate)}
                  >
                    <div 
                      className="h-full rounded-l-md bg-blue-500 flex items-center justify-end pr-2"
                      style={{ width: `${task.progress}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {task.progress}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-700 px-2">
                      {task.items.reduce((sum, item) => sum + item.quantity, 0)} units
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span>Progress</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-200 rounded mr-2"></div>
                  <span>Total Duration</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {timeframe.start.toLocaleDateString()} - {timeframe.end.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}