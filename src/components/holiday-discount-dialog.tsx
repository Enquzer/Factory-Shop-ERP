'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HolidayDiscountForm } from './holiday-discount-form';
import { HolidayDiscount, CreateHolidayDiscountInput, UpdateHolidayDiscountInput } from '@/lib/holiday-discounts';

interface HolidayDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount?: HolidayDiscount | null;
  onSubmit: (data: CreateHolidayDiscountInput | UpdateHolidayDiscountInput) => Promise<void>;
}

export function HolidayDiscountDialog({ 
  open, 
  onOpenChange, 
  discount, 
  onSubmit 
}: HolidayDiscountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateHolidayDiscountInput | UpdateHolidayDiscountInput) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {discount ? 'Edit Holiday Discount' : 'Create Holiday Discount'}
          </DialogTitle>
          <DialogDescription>
            {discount ? 'Modify the details of this holiday discount.' : 'Create a new holiday discount for customers.'}
          </DialogDescription>
        </DialogHeader>
        
        <HolidayDiscountForm
          discount={discount || undefined}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}