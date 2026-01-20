"use client";

import type { Order, OrderStatus } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle, Clock, X } from "lucide-react";
import { useMemo } from "react";

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
  const currentStepIndex = useMemo(() => {
    return ORDER_STATUS_FLOW.findIndex(step => step.status === order.status);
  }, [order.status]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Order Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -z-10 transform -translate-y-1/2"></div>
          
          {ORDER_STATUS_FLOW.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isCancelled = order.status === 'Cancelled' && step.status === 'Cancelled';
            
            return (
              <div key={step.status} className="flex flex-col items-center flex-1 min-w-[0] px-1">
                {/* Status indicator */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isCompleted || isCurrent || isCancelled
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-muted'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent || isCancelled ? (
                    <Circle className="w-4 h-4 fill-current" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted"></div>
                  )}
                </div>
                
                {/* Status label */}
                <div className="mt-2 text-center w-full max-w-[100px] min-w-0">
                  <p className={`text-xs font-medium truncate ${
                    isCurrent || isCancelled ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <Badge variant="default" className="mt-1">
                      Current
                    </Badge>
                  )}
                  {isCancelled && step.status === 'Cancelled' && (
                    <Badge variant="destructive" className="mt-1">
                      Cancelled
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Current status description */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h4 className="font-medium">Current Status</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {ORDER_STATUS_FLOW[currentStepIndex]?.description}
          </p>
          
          {order.status === 'Cancelled' && order.feedback && (
            <div className="mt-3 p-3 bg-background rounded border">
              <h5 className="font-medium text-sm">Cancellation Reason</h5>
              <p className="text-sm text-muted-foreground mt-1">{order.feedback}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}