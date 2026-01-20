"use client";

import type { OrderStatus } from "@/lib/orders";

interface StatusStep {
  status: OrderStatus;
  label: string;
}

const ORDER_STATUS_FLOW: StatusStep[] = [
  { status: 'Pending', label: 'Order Placed' },
  { status: 'Awaiting Payment', label: 'Payment Awaiting' },
  { status: 'Paid', label: 'Payment Confirmed' },
  { status: 'Released', label: 'Released to Store' },
  { status: 'Dispatched', label: 'Order Dispatched' },
  { status: 'Delivered', label: 'Order Delivered' },
  { status: 'Cancelled', label: 'Order Cancelled' }
];

export function OrderStatusIndicator({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_STATUS_FLOW.findIndex(step => step.status === status);
  
  return (
    <div className="flex items-center w-32">
      {ORDER_STATUS_FLOW.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <div key={step.status} className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${
              isCompleted ? 'bg-green-500' : 
              isCurrent ? 'bg-blue-500' : 'bg-gray-300'
            }`} />
            {index < ORDER_STATUS_FLOW.length - 1 && (
              <div className={`w-3 h-0.5 ${
                isCompleted ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}