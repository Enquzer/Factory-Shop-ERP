'use client';

import { useState, useEffect } from 'react';
import { ResponsiveTable } from '@/components/responsive-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBulkSelection } from '@/contexts/bulk-selection-context';
import { CheckSquare, Square, SquareArrowOutUpRight } from 'lucide-react';

interface BulkSelectionTableProps {
  headers: { 
    key: string; 
    title: string; 
    className?: string;
    mobileTitle?: string;
  }[];
  data: any[];
  renderRow?: (item: any, index: number) => React.ReactNode;
  className?: string;
  idKey?: string; // Key to use as the unique identifier, defaults to 'id'
  actions?: React.ReactNode; // Additional actions to show when items are selected
  showSelectAll?: boolean; // Whether to show select all checkbox in header
  onRowClick?: (item: any, index: number) => void; // Callback when row is clicked
}

export function BulkSelectionTable({
  headers,
  data,
  renderRow,
  className,
  idKey = 'id',
  actions,
  showSelectAll = true,
  onRowClick,
}: BulkSelectionTableProps) {
  const { selectedItems, toggleItem, toggleSelectAll, isAllSelected } = useBulkSelection();
  const [isMobileView, setIsMobileView] = useState(false);

  // Check if we're in mobile view by checking screen size
  // This is a simplified approach - in a real app you might use a responsive hook
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobileView(window.innerWidth < 768);
      
      const handleResize = () => {
        setIsMobileView(window.innerWidth < 768);
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // Enhanced headers to include checkbox column
  // Only add the select header if we're not using a custom renderRow (table layout)
  const enhancedHeaders = showSelectAll && !renderRow
    ? [
        {
          key: 'select',
          title: (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={isAllSelected(data)}
                onCheckedChange={() => toggleSelectAll(data)}
                aria-label="Select all"
              />
            </div>
          ) as any,
          className: 'w-12',
          mobileTitle: 'Select',
        },
        ...headers.map(header => ({
          ...header,
          // Add text wrapping classes to help with alignment
          className: header.className || 'whitespace-nowrap truncate'
        }))
      ]
    : headers.map(header => ({
      ...header,
      // Add text wrapping classes to help with alignment
      className: header.className || 'whitespace-nowrap truncate'
    }));

  // Enhanced data with selection state
  // Only add select field if we're not using a custom renderRow function
  const enhancedData = renderRow ? data : data.map(item => ({
    ...item,
    select: (
      <Checkbox
        id={`select-${item[idKey]}`}
        checked={selectedItems.includes(item[idKey])}
        onCheckedChange={() => toggleItem(item[idKey])}
        onClick={(e) => e.stopPropagation()} // Prevent row click when checkbox is clicked
        aria-label={`Select ${item.name || item[idKey]}`}
      />
    )
  }));

  // Enhanced renderRow function to include selection
  const enhancedRenderRow = renderRow
    ? (item: any, index: number) => {
      // For custom renderRow functions, we need to determine if we're in mobile view
      // to decide how to handle the selection checkbox
      if (isMobileView) {
        // For mobile view, wrap with card-style layout
        const originalContent = renderRow(item, index);
        return (
          <div 
            key={item[idKey] || index}
            className={cn(
              'relative',
              selectedItems.includes(item[idKey]) ? 'bg-muted/50' : '',
              onRowClick ? 'cursor-pointer' : ''
            )}
            onClick={() => onRowClick && onRowClick(item, index)}
          >
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                id={`select-${item[idKey]}`}
                checked={selectedItems.includes(item[idKey])}
                onCheckedChange={() => toggleItem(item[idKey])}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${item.name || item[idKey]}`}
              />
            </div>
            <div className="pl-8">
              {originalContent}
            </div>
          </div>
        );
      } else {
        // For desktop view, use table row structure
        const selectCell = (
          <td className="w-12 align-middle">
            <div className="flex items-center pl-2">
              <Checkbox
                id={`select-${item[idKey]}`}
                checked={selectedItems.includes(item[idKey])}
                onCheckedChange={() => toggleItem(item[idKey])}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${item.name || item[idKey]}`}
              />
            </div>
          </td>
        );
        
        const originalRow = renderRow(item, index);
        
        // Create a table row with the selection checkbox as the first cell
        return (
          <tr 
            key={item[idKey] || index} 
            className={cn(
              selectedItems.includes(item[idKey]) ? 'bg-muted/50' : '',
              onRowClick ? 'cursor-pointer' : ''
            )}
            onClick={() => onRowClick && onRowClick(item, index)}
          >
            {selectCell}
            {originalRow}
          </tr>
        );
      }
    }
    : undefined;

  return (
    <div className="space-y-4">
      {selectedItems.length > 0 && actions && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        </div>
      )}
      
      <ResponsiveTable
        headers={enhancedHeaders}
        data={enhancedData}
        renderRow={enhancedRenderRow}
        className={className}
        collapsible={!isMobileView} // Disable collapsible on mobile when using bulk selection
      />
    </div>
  );
}