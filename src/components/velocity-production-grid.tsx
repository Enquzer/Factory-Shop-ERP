"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductionItem {
  id: string;
  size: string;
  color: string;
  plannedQuantity: number;
  previousDepartmentTotal?: number; // Used for role-based constraints
  currentDepartmentTotal?: number; // Current total entered today
  previousEntries?: number[]; // Last 3 entries for average calculation
}

interface VelocityProductionGridProps {
  orderId: string;
  orderNumber: string;
  styleCode: string;
  totalOrderQty: number;
  productImage?: string;
  items: ProductionItem[];
  userRole: 'cutting' | 'sewing' | 'packing' | 'quality_inspection' | 'other';
  onSave: (updates: { id: string; quantity: number }[]) => void;
  isLoading?: boolean;
}

export function VelocityProductionGrid({
  orderId,
  orderNumber,
  styleCode,
  totalOrderQty,
  productImage,
  items,
  userRole,
  onSave,
  isLoading = false
}: VelocityProductionGridProps) {
  // State for all inputs
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  // Calculate unique colors and sizes
  const colors = useMemo(() => 
    Array.from(new Set(items.map(item => item.color))).sort(), 
    [items]
  );
  
  const sizes = useMemo(() => 
    Array.from(new Set(items.map(item => item.size))).sort(), 
    [items]
  );

  // Initialize inputs when items change
  useEffect(() => {
    const initialInputs: Record<string, number> = {};
    items.forEach(item => {
      const key = `${item.color}-${item.size}`;
      initialInputs[key] = item.currentDepartmentTotal || 0;
    });
    setInputs(initialInputs);
  }, [items]);

  // Handle input change
  const handleInputChange = (color: string, size: string, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, parseInt(value) || 0);
    const key = `${color}-${size}`;
    
    // Check constraint: cannot exceed previous department's total
    const item = items.find(i => i.color === color && i.size === size);
    if (item) {
      const maxAllowed = getMaxAllowedQuantity(item);
      if (numValue > maxAllowed) {
        return; // Don't update if constraint violated
      }
    }
    
    setInputs(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  // Handle keyboard navigation (auto-advance)
  const handleKeyDown = (color: string, size: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    const colorIndex = colors.indexOf(color);
    const sizeIndex = sizes.indexOf(size);
    
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      // Move to next size in same color (left to right)
      const nextSizeIndex = sizeIndex + 1;
      if (nextSizeIndex < sizes.length) {
        const nextSize = sizes[nextSizeIndex];
        const nextKey = `${color}-${nextSize}`;
        const nextElement = document.getElementById(nextKey);
        if (nextElement) {
          nextElement.focus();
          setFocusedCell(nextKey);
        }
      } else if (colorIndex + 1 < colors.length) {
        // Move to first size of next color
        const nextColor = colors[colorIndex + 1];
        const nextKey = `${nextColor}-${sizes[0]}`;
        const nextElement = document.getElementById(nextKey);
        if (nextElement) {
          nextElement.focus();
          setFocusedCell(nextKey);
        }
      }
    } else if (e.key === 'ArrowRight' && sizeIndex < sizes.length - 1) {
      e.preventDefault();
      const nextSize = sizes[sizeIndex + 1];
      const nextKey = `${color}-${nextSize}`;
      const nextElement = document.getElementById(nextKey);
      if (nextElement) {
        nextElement.focus();
        setFocusedCell(nextKey);
      }
    } else if (e.key === 'ArrowLeft' && sizeIndex > 0) {
      e.preventDefault();
      const prevSize = sizes[sizeIndex - 1];
      const prevKey = `${color}-${prevSize}`;
      const prevElement = document.getElementById(prevKey);
      if (prevElement) {
        prevElement.focus();
        setFocusedCell(prevKey);
      }
    } else if (e.key === 'ArrowDown' && colorIndex < colors.length - 1) {
      e.preventDefault();
      const nextColor = colors[colorIndex + 1];
      const nextKey = `${nextColor}-${size}`;
      const nextElement = document.getElementById(nextKey);
      if (nextElement) {
        nextElement.focus();
        setFocusedCell(nextKey);
      }
    } else if (e.key === 'ArrowUp' && colorIndex > 0) {
      e.preventDefault();
      const prevColor = colors[colorIndex - 1];
      const prevKey = `${prevColor}-${size}`;
      const prevElement = document.getElementById(prevKey);
      if (prevElement) {
        prevElement.focus();
        setFocusedCell(prevKey);
      }
    }
  };

  // Get max allowed quantity based on role and previous department
  const getMaxAllowedQuantity = useCallback((item: ProductionItem) => {
    // Different roles have different constraints
    switch(userRole) {
      case 'sewing':
        // Sewing user can only enter up to what was cut
        return item.previousDepartmentTotal ?? item.plannedQuantity;
      case 'packing':
        // Packing user can only enter up to what was sewn
        return item.previousDepartmentTotal ?? item.plannedQuantity;
      case 'quality_inspection':
        // Quality inspection user can only enter up to what was sewn
        return item.previousDepartmentTotal ?? item.plannedQuantity;
      default:
        // Cutting user can enter up to planned quantity
        return item.plannedQuantity;
    }
  }, [userRole]);

  // Calculate totals and statistics
  const totalEnteredToday = useMemo(() => {
    return Object.values(inputs).reduce((sum, val) => sum + val, 0);
  }, [inputs]);

  const totalRemaining = useMemo(() => {
    // Calculate remaining based on what's been entered in this session
    // plus what was previously produced (from item.currentDepartmentTotal)
    return items.reduce((sum, item) => {
      const key = `${item.color}-${item.size}`;
      const enteredThisSession = inputs[key] || 0;
      const previouslyEntered = item.currentDepartmentTotal || 0;
      const totalEntered = enteredThisSession + previouslyEntered;
      const maxPossible = getMaxAllowedQuantity(item);
      return sum + Math.max(0, maxPossible - totalEntered);
    }, 0);
  }, [items, inputs, getMaxAllowedQuantity]);

  // Calculate average of last 3 entries for estimation
  const calculateAverageDailyRate = useCallback(() => {
    // For simplicity, we'll calculate average of all items
    // In a real implementation, you'd track historical data
    const recentEntries = items.flatMap(item => 
      item.previousEntries?.slice(-3) || []
    ).slice(-3);
    
    if (recentEntries.length > 0) {
      const avg = recentEntries.reduce((sum, val) => sum + val, 0) / recentEntries.length;
      return Math.round(avg);
    }
    
    // If no historical data, estimate based on order timeline
    // Assume production started and calculate reasonable daily rate
    const totalToProduce = items.reduce((sum, item) => sum + item.plannedQuantity, 0);
    const producedSoFar = items.reduce((sum, item) => sum + (item.currentDepartmentTotal || 0), 0);
    
    if (producedSoFar > 0) {
      // If some production has happened, use that as baseline
      return Math.max(1, Math.round(producedSoFar / 3)); // Assume 3 days of production
    }
    
    // If no production yet, estimate based on total quantity and timeline
    // This is a rough estimate - in practice you'd want more sophisticated logic
    return Math.max(10, Math.round(totalToProduce / 10)); // Assume 10-day production cycle as fallback
  }, [items]);

  const estimatedDaysToFinish = useMemo(() => {
    const avgDailyRate = calculateAverageDailyRate();
    if (avgDailyRate <= 0 || totalRemaining <= 0) return null;
    const days = totalRemaining / avgDailyRate;
    return Math.max(0.1, days); // Minimum 0.1 days to avoid showing 0
  }, [totalRemaining, calculateAverageDailyRate]);

  // Handle tap-to-fill (long press simulation with right-click)
  const handleContextMenu = (color: string, size: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent context menu
    
    const item = items.find(i => i.color === color && i.size === size);
    if (!item) return;
    
    const key = `${color}-${size}`;
    const maxPossible = getMaxAllowedQuantity(item);
    const enteredThisSession = inputs[key] || 0;
    const previouslyEntered = item.currentDepartmentTotal || 0;
    const totalEntered = enteredThisSession + previouslyEntered;
    
    // Fill with remaining balance
    const remaining = maxPossible - totalEntered;
    const newValue = Math.min(maxPossible, totalEntered + remaining);
    
    setInputs(prev => ({
      ...prev,
      [key]: newValue - previouslyEntered // Adjust to session input only
    }));
  };

  // Prepare data for save
  const handleSave = () => {
    const updates = items.map(item => ({
      id: item.id,
      quantity: inputs[`${item.color}-${item.size}`] || 0
    }));
    onSave(updates);
  };

  // Get role display name
  const getRoleDisplayName = () => {
    switch(userRole) {
      case 'cutting': return 'Cutting';
      case 'sewing': return 'Sewing';
      case 'packing': return 'Packing';
      case 'quality_inspection': return 'Quality Inspection';
      default: return 'Production';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-4 flex-wrap">
            {productImage && (
              <img 
                src={productImage} 
                alt="Product" 
                className="w-16 h-16 object-cover rounded-md border"
              />
            )}
            <div>
              <div className="text-lg font-semibold">Order: {orderNumber}</div>
              <div className="text-sm text-muted-foreground">Style: {styleCode} | Total Qty: {totalOrderQty.toLocaleString()}</div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Velocity Grid */}
      <Card className="flex-grow mb-4 overflow-hidden">
        <CardContent className="p-0 h-full overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="p-3 border-b border-r text-left bg-gray-100 sticky left-0 z-10 min-w-[100px]">COLOR</th>
                {sizes.map(size => (
                  <th 
                    key={size} 
                    className="p-3 border-b text-center min-w-[100px] bg-gray-100"
                  >
                    SIZE: {size}
                  </th>
                ))}
                <th className="p-3 border-b border-l text-center bg-gray-100 min-w-[100px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {colors.map(color => (
                <tr key={color} className="hover:bg-gray-50">
                  <td className="p-3 border-b border-r font-medium sticky left-0 bg-white z-10 min-w-[100px]">{color}</td>
                  {sizes.map(size => {
                    const item = items.find(i => i.color === color && i.size === size);
                    const key = `${color}-${size}`;
                    const enteredThisSession = inputs[key] || 0;
                    const previouslyEntered = item?.currentDepartmentTotal || 0;
                    const totalEntered = enteredThisSession + previouslyEntered;
                    const maxPossible = item ? getMaxAllowedQuantity(item) : 0;
                    const balanceRemaining = Math.max(0, maxPossible - totalEntered);
                    
                    return (
                      <td 
                        key={`${color}-${size}`} 
                        className="p-1 border-b text-center align-top relative"
                      >
                        <div className="relative">
                          <input
                            id={key}
                            type="number"
                            inputMode="numeric"
                            value={enteredThisSession}
                            onChange={(e) => handleInputChange(color, size, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(color, size, e)}
                            onFocus={() => setFocusedCell(key)}
                            onBlur={() => setFocusedCell(null)}
                            onContextMenu={(e) => handleContextMenu(color, size, e)}
                            className={`w-full p-3 text-center text-lg border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              focusedCell === key ? 'bg-blue-50' : ''
                            }`}
                            min="0"
                            max={maxPossible}
                            placeholder="0"
                          />
                          {balanceRemaining > 0 && (
                            <span className="absolute top-1 right-1 text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                              {balanceRemaining}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Bal: {balanceRemaining}
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-3 border-b border-l font-medium text-center bg-gray-50 min-w-[100px]">
                    {items
                      .filter(item => item.color === color)
                      .reduce((sum, item) => {
                        const key = `${item.color}-${item.size}`;
                        return sum + (inputs[key] || 0);
                      }, 0)
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Stats Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            Estimated Days to Finish: {estimatedDaysToFinish !== null ? estimatedDaysToFinish.toFixed(1) : 'N/A'} Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="text-sm font-medium">Status</div>
              <div className="text-xs text-muted-foreground">{getRoleDisplayName()}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-md">
              <div className="text-sm font-medium">Remaining</div>
              <div className="text-xs text-muted-foreground">{totalRemaining} units</div>
              <div className="text-xs text-muted-foreground mt-1">Based on planned vs entered</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-md">
              <div className="text-sm font-medium">Daily Avg</div>
              <div className="text-xs text-muted-foreground">{calculateAverageDailyRate()} units</div>
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              onClick={handleSave} 
              className="w-full py-6 text-lg" 
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'SAVE DATA'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}