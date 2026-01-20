'use client';

import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';

interface BulkSelectionContextType {
  selectedItems: string[];
  toggleItem: (id: string) => void;
  selectAll: (items: { id: string }[]) => void;
  clearSelection: () => void;
  removeItem: (id: string) => void;
  isSelected: (id: string) => boolean;
  selectItem: (id: string) => void;
  toggleSelectAll: (items: { id: string }[]) => void;
  isAllSelected: (items: { id: string }[]) => boolean;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | undefined>(undefined);

export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  }, []);

  const selectItem = useCallback((id: string) => {
    setSelectedItems(prev => [...prev, id]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setSelectedItems(prev => prev.filter(itemId => itemId !== id));
  }, []);

  const selectAll = useCallback((items: { id: string }[]) => {
    setSelectedItems(items.map(item => item.id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedItems.includes(id);
  }, [selectedItems]);

  const toggleSelectAll = useCallback((items: { id: string }[]) => {
    if (selectedItems.length === items.length) {
      clearSelection();
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  }, [selectedItems.length, clearSelection]);

  const isAllSelected = useCallback((items: { id: string }[]) => {
    return items.length > 0 && items.every(item => selectedItems.includes(item.id));
  }, [selectedItems]);

  return (
    <BulkSelectionContext.Provider
      value={{
        selectedItems,
        toggleItem,
        selectAll,
        clearSelection,
        removeItem,
        isSelected,
        selectItem,
        toggleSelectAll,
        isAllSelected,
      }}
    >
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);
  if (context === undefined) {
    throw new Error('useBulkSelection must be used within a BulkSelectionProvider');
  }
  return context;
}