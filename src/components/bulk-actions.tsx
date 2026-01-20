'use client';

import { Button } from '@/components/ui/button';
import { useBulkSelection } from '@/contexts/bulk-selection-context';
import { Printer, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface BulkActionsProps {
  onPrint?: (selectedIds: string[]) => void;
  onDelete?: (selectedIds: string[]) => void;
  onOrder?: (selectedIds: string[]) => void;
  printLabel?: string;
  deleteLabel?: string;
  orderLabel?: string;
  itemType?: string; // Type of items being operated on (e.g., 'products', 'orders', 'inventory')
}

export function BulkActions({ 
  onPrint, 
  onDelete, 
  onOrder,
  printLabel = 'Print Selected', 
  deleteLabel = 'Delete Selected',
  orderLabel = 'Order Selected',
  itemType = 'items' 
}: BulkActionsProps) {
  const { selectedItems, clearSelection } = useBulkSelection();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handlePrint = () => {
    if (onPrint && selectedItems.length > 0) {
      onPrint(selectedItems);
      clearSelection();
    }
  };

  const handleDelete = () => {
    if (onDelete && selectedItems.length > 0) {
      onDelete(selectedItems);
      clearSelection();
    }
    setShowDeleteDialog(false);
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      {onPrint && (
        <Button size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          {printLabel}
        </Button>
      )}
      
      {onOrder && (
        <Button 
          size="sm" 
          variant="default" 
          onClick={() => {
            onOrder(selectedItems);
            clearSelection();
          }}
        >
          {orderLabel}
        </Button>
      )}
      
      {onDelete && (
        <>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteLabel}
          </Button>
          
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {selectedItems.length} {itemType}? 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}