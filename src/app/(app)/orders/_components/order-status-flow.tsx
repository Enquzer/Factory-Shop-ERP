"use client";

import type { Order, OrderStatus } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Circle, X } from "lucide-react";

interface StatusStep {
  status: OrderStatus;
  label: string;
  description: string;
}

const ORDER_STATUS_FLOW: StatusStep[] = [
  { status: 'Pending', label: 'Order Placed', description: 'Order created by shop' },
  { status: 'Awaiting Payment', label: 'Payment Awaiting', description: 'Order confirmed by factory' },
  { status: 'Paid', label: 'Payment Confirmed', description: 'Payment verified by factory' },
  { status: 'Dispatched', label: 'Order Dispatched', description: 'Order shipped by factory' },
  { status: 'Delivered', label: 'Order Delivered', description: 'Order received by shop' },
  { status: 'Cancelled', label: 'Order Cancelled', description: 'Order cancelled' }
];

export function OrderStatusFlow({ order }: { order: Order }) {
  const getCurrentStepIndex = () => {
    return ORDER_STATUS_FLOW.findIndex(step => step.status === order.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -z-10 transform -translate-y-1/2"></div>
          
          {ORDER_STATUS_FLOW.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isCancelled = order.status === 'Cancelled' && step.status === 'Cancelled';
            
            return (
              <div key={step.status} className="flex flex-col items-center relative">
                {/* Status indicator */}
                <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                  isCompleted || isCurrent || isCancelled
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-muted'
                }`}>
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : isCurrent || isCancelled ? (
                    <Circle className="w-3 h-3 fill-current" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Current status description */}
        <div className="mt-3 text-center">
          <Badge variant="default" className="text-xs">
            {ORDER_STATUS_FLOW[currentStepIndex]?.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}