"use client"

import { ReactNode } from 'react';
import { useResponsive } from '@/contexts/responsive-context';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  mobileCols?: number;
  tabletCols?: number;
  desktopCols?: number;
  largeDesktopCols?: number;
  gap?: number | string;
}

export function ResponsiveGrid({
  children,
  className,
  mobileCols = 1,
  tabletCols = 2,
  desktopCols = 3,
  largeDesktopCols = 4,
  gap = 4
}: ResponsiveGridProps) {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useResponsive();
  
  let cols = desktopCols;
  
  if (isMobile) {
    cols = mobileCols;
  } else if (isTablet) {
    cols = tabletCols;
  } else if (isDesktop) {
    cols = desktopCols;
  } else if (isLargeDesktop) {
    cols = largeDesktopCols;
  }
  
  const gapClass = typeof gap === 'number' ? `gap-${gap}` : gap;
  
  return (
    <div 
      className={cn(
        `grid grid-cols-1 sm:grid-cols-${cols} ${gapClass}`,
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
      }}
    >
      {children}
    </div>
  );
}

interface ResponsiveGridItemProps {
  children: ReactNode;
  className?: string;
  spanAllColumns?: boolean;
}

export function ResponsiveGridItem({
  children,
  className,
  spanAllColumns = false
}: ResponsiveGridItemProps) {
  const { isMobile, isTablet } = useResponsive();
  
  if (spanAllColumns) {
    return (
      <div className={cn("col-span-full", className)}>
        {children}
      </div>
    );
  }
  
  return (
    <div className={className}>
      {children}
    </div>
  );
}