"use client"

import { ReactNode, useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useResponsive } from '@/contexts/responsive-context';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  headers: { 
    key: string; 
    title: string; 
    className?: string;
    mobileTitle?: string; // Shorter title for mobile
  }[];
  data: any[];
  renderRow?: (item: any, index: number) => ReactNode;
  className?: string;
  collapsible?: boolean; // Whether to show collapsible rows on mobile
}

export function ResponsiveTable({
  headers,
  data,
  renderRow,
  className,
  collapsible = true
}: ResponsiveTableProps) {
  const { isMobile, isTablet } = useResponsive();
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setOpenRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (isMobile || isTablet) {
    // Mobile/tablet view - stacked layout
    return (
      <div className={cn("space-y-2", className)}>
        {data.map((item, index) => {
          const itemId = item.id || index;
          const isOpen = openRows[itemId] || false;
          
          return (
            <div 
              key={itemId} 
              className="border rounded-lg p-3 bg-card"
            >
              {collapsible ? (
                <Collapsible open={isOpen} onOpenChange={() => toggleRow(itemId.toString())}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full flex justify-between p-0 h-auto hover:bg-transparent"
                    >
                      <div className="font-medium text-left">
                        {item[headers[0].key] || `Item ${index + 1}`}
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {headers.slice(1).map((header) => (
                      <div key={header.key} className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground text-sm">
                          {header.mobileTitle || header.title}:
                        </span>
                        <span className="text-sm font-medium">
                          {typeof item[header.key] === 'object' 
                            ? (item[header.key]?.toString ? item[header.key].toString() : '[Object]')
                            : item[header.key]}
                        </span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Non-collapsible mobile view
                <div className="space-y-2">
                  {headers.map((header) => (
                    <div key={header.key} className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        {header.mobileTitle || header.title}:
                      </span>
                      <span className="text-sm font-medium">
                        {typeof item[header.key] === 'object' 
                          ? (item[header.key]?.toString ? item[header.key].toString() : '[Object]')
                          : item[header.key]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop view - regular table
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead 
              key={header.key} 
              className={cn(header.className, 'whitespace-nowrap truncate')}
            >
              <div className="truncate" title={typeof header.title === 'string' ? header.title : undefined}>
                {header.title}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => 
          renderRow ? (
            renderRow(item, index)
          ) : (
            <TableRow key={item.id || index}>
              {headers.map((header) => (
                <TableCell 
                  key={header.key} 
                  className={cn(header.className, 'whitespace-nowrap truncate')}
                >
                  <div className="truncate" title={typeof item[header.key] === 'string' ? item[header.key] : undefined}>
                    {item[header.key]}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}