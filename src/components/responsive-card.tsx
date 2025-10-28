"use client"

import { ReactNode } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { useResponsive } from '@/contexts/responsive-context';
import { cn } from '@/lib/utils';

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ResponsiveCard({
  children,
  className,
  title,
  description,
  footer,
  collapsible = false,
  defaultCollapsed = false
}: ResponsiveCardProps) {
  const { isMobile, isTablet } = useResponsive();
  
  // Adjust padding for mobile
  const paddingClass = isMobile ? "p-3" : "p-6";
  
  return (
    <Card className={cn(className)}>
      {(title || description) && (
        <CardHeader className={isMobile ? "p-3 pb-0" : "p-6 pb-2"}>
          {title && (
            <CardTitle className={isMobile ? "text-lg" : ""}>
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className={isMobile ? "text-xs" : ""}>
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(paddingClass, isMobile ? "pt-3" : "pt-6")}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className={isMobile ? "p-3 pt-0" : "p-6 pt-2"}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

interface ResponsiveCardGridProps {
  children: ReactNode;
  className?: string;
  columns?: number;
}

export function ResponsiveCardGrid({
  children,
  className,
  columns = 3
}: ResponsiveCardGridProps) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // Adjust columns based on device
  let gridColumns = columns;
  if (isMobile) {
    gridColumns = 1;
  } else if (isTablet) {
    gridColumns = Math.min(columns, 2);
  } else if (isDesktop) {
    gridColumns = Math.min(columns, 3);
  }
  
  return (
    <div 
      className={cn(
        "grid gap-4",
        gridColumns === 1 ? "grid-cols-1" : 
        gridColumns === 2 ? "grid-cols-2" : 
        "grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}