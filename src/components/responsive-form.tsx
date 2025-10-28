"use client"

import { ReactNode } from 'react';
import { useResponsive } from '@/contexts/responsive-context';
import { cn } from '@/lib/utils';

interface ResponsiveFormProps {
  children: ReactNode;
  className?: string;
  layout?: 'vertical' | 'horizontal' | 'auto';
}

export function ResponsiveForm({
  children,
  className,
  layout = 'auto'
}: ResponsiveFormProps) {
  const { isMobile, isTablet } = useResponsive();
  
  // Determine layout based on device and props
  let formLayout = layout;
  if (layout === 'auto') {
    formLayout = isMobile ? 'vertical' : 'horizontal';
  }
  
  return (
    <div 
      className={cn(
        "space-y-4",
        formLayout === 'vertical' ? "flex flex-col gap-4" : "",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveFormItemProps {
  children: ReactNode;
  className?: string;
  label?: ReactNode;
  labelPosition?: 'top' | 'left' | 'auto';
}

export function ResponsiveFormItem({
  children,
  className,
  label,
  labelPosition = 'auto'
}: ResponsiveFormItemProps) {
  const { isMobile, isTablet } = useResponsive();
  
  // Determine label position based on device and props
  let position = labelPosition;
  if (labelPosition === 'auto') {
    position = isMobile ? 'top' : 'left';
  }
  
  if (position === 'top') {
    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </div>
        )}
        {children}
      </div>
    );
  }
  
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {label && (
        <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 min-w-[100px]">
          {label}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

interface ResponsiveFormGridProps {
  children: ReactNode;
  className?: string;
  columns?: number;
}

export function ResponsiveFormGrid({
  children,
  className,
  columns = 2
}: ResponsiveFormGridProps) {
  const { isMobile, isTablet } = useResponsive();
  
  // Adjust columns based on device
  let gridColumns = columns;
  if (isMobile) {
    gridColumns = 1;
  } else if (isTablet) {
    gridColumns = Math.min(columns, 2);
  }
  
  return (
    <div 
      className={cn(
        `grid gap-4`,
        gridColumns === 1 ? "grid-cols-1" : `grid-cols-${gridColumns}`,
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`
      }}
    >
      {children}
    </div>
  );
}