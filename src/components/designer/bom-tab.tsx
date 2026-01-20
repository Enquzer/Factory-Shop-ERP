
"use client";

import { useState } from 'react';
import { BOMItem } from '@/lib/styles-sqlite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BomTabProps {
  styleId: string;
  initialBom: BOMItem[];
}

export function BomTab({ styleId, initialBom }: BomTabProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<BOMItem[]>(initialBom);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const addItem = async () => {
    try {
        const newItem: Partial<BOMItem> = {
            styleId: styleId,
            type: 'Fabric',
            itemName: '',
            consumption: 0,
            unit: 'M',
            cost: 0,
            currency: 'ETB'
        };

        const res = await fetch('/api/designer/bom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        });

        if (!res.ok) throw new Error('Failed to add item');
        const createdItem = await res.json();
        setItems([...items, createdItem]);
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to create BOM item', variant: 'destructive' });
    }
  };

  const updateItem = async (id: string, updates: Partial<BOMItem>) => {
      // Optimistic update
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));

      // Debounce or immediate? For consistency, let's fire and forget (with error handling)
      // Real-world: Should specific debounce, but direct fetch is fine for low frequency edits.
      try {
          // fetch is async, we don't await to block UI, but we catch errors
          fetch(`/api/designer/bom/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updates)
          });
      } catch (error) {
          console.error('Failed to save BOM item', error);
          toast({ title: 'Sync Error', description: 'Failed to save changes.', variant: 'destructive' });
      }
  };

  const deleteItem = async (id: string) => {
      setLoadingId(id);
      try {
          const res = await fetch(`/api/designer/bom/${id}`, {
            method: 'DELETE'
          });
          if (!res.ok) throw new Error('Failed delete');
          setItems(prev => prev.filter(item => item.id !== id));
      } catch (error) {
          toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
      } finally {
          setLoadingId(null);
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Bill of Materials</h3>
        <Button onClick={addItem} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[120px]">Type</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="w-[100px]">Supplier</TableHead>
              <TableHead className="w-[100px] text-right">Consumption</TableHead>
              <TableHead className="w-[80px]">Unit</TableHead>
              <TableHead className="w-[100px] text-right">Cost</TableHead>
              <TableHead className="w-[150px]">Comments</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-slate-500">
                        No items in BOM. Click "Add Item" to start.
                    </TableCell>
                </TableRow>
            ) : (
                items.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <Select 
                                value={item.type} 
                                onValueChange={(val: any) => updateItem(item.id, { type: val })}
                            >
                                <SelectTrigger className="h-8 border-transparent hover:border-slate-200 focus:border-slate-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fabric">Fabric</SelectItem>
                                    <SelectItem value="Trim">Trim</SelectItem>
                                    <SelectItem value="Finishing">Finishing</SelectItem>
                                    <SelectItem value="Packaging">Packaging</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell>
                            <Input 
                                value={item.itemName || ''} 
                                onChange={(e) => updateItem(item.id, { itemName: e.target.value })}
                                className="h-8 border-transparent hover:border-slate-200 focus:border-slate-300"
                                placeholder="Item name"
                            />
                        </TableCell>
                        <TableCell>
                            <Input 
                                value={item.supplier || ''} 
                                onChange={(e) => updateItem(item.id, { supplier: e.target.value })}
                                className="h-8 border-transparent hover:border-slate-200 focus:border-slate-300"
                                placeholder="Supplier"
                            />
                        </TableCell>
                        <TableCell>
                             <Input 
                                type="number"
                                value={item.consumption || 0} 
                                onChange={(e) => updateItem(item.id, { consumption: parseFloat(e.target.value) })}
                                className="h-8 text-right border-transparent hover:border-slate-200 focus:border-slate-300"
                            />
                        </TableCell>
                        <TableCell>
                             <Input 
                                value={item.unit || ''} 
                                onChange={(e) => updateItem(item.id, { unit: e.target.value })} // Fixed to update 'unit' instead of 'consumption'
                                className="h-8 border-transparent hover:border-slate-200 focus:border-slate-300"
                                placeholder="Unit"
                            />
                        </TableCell>
                        <TableCell>
                             <div className="flex items-center gap-1">
                                <Input 
                                    type="number"
                                    value={item.cost || 0} 
                                    onChange={(e) => updateItem(item.id, { cost: parseFloat(e.target.value) })}
                                    className="h-8 text-right border-transparent hover:border-slate-200 focus:border-slate-300 w-full"
                                />
                                <span className="text-xs text-slate-400">{item.currency}</span>
                             </div>
                        </TableCell>
                        <TableCell>
                             <Input 
                                value={item.comments || ''} 
                                onChange={(e) => updateItem(item.id, { comments: e.target.value })}
                                className="h-8 border-transparent hover:border-slate-200 focus:border-slate-300"
                                placeholder="..."
                            />
                        </TableCell>
                        <TableCell>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteItem(item.id)}
                                disabled={loadingId === item.id}
                            >
                                {loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            )}
            {/* Totals Row */}
            {items.length > 0 && (
                <TableRow className="bg-slate-50 font-medium">
                    <TableCell colSpan={5} className="text-right pr-4">Total Cost Estimate:</TableCell>
                    <TableCell className="text-right">
                        {items.reduce((sum, item) => sum + ((item.cost || 0) * (item.consumption || 0)), 0).toFixed(2)} ETB
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
