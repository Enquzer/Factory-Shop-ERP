
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  Loader2, 
  Check, 
  AlertCircle,
  PackagePlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  costPerUnit: number;
  supplier?: string;
}

interface RawMaterialSelectorProps {
  onSelect: (material: RawMaterial) => void;
  value?: string;
  placeholder?: string;
}

export function RawMaterialSelector({ onSelect, value, placeholder }: RawMaterialSelectorProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New Purchase Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    name: '',
    quantity: 1,
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMaterials();
    }
  }, [open]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch materials', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = (materials || []).filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleRequestNew = async () => {
    if (!newRequest.name) return;
    
    setIsSubmitting(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    try {
      const res = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          materialName: newRequest.name,
          quantity: newRequest.quantity,
          reason: newRequest.reason
        })
      });
      
      if (res.ok) {
        toast({ title: "Success", description: "Purchase request submitted to Store department." });
        setIsRequestModalOpen(false);
        setNewRequest({ name: '', quantity: 1, reason: '' });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-8 text-xs font-normal border-transparent hover:border-slate-200 focus:border-slate-300 px-2"
          >
            {value || placeholder || "Select material..."}
            <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search materials..."
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No materials found.
              </div>
            ) : (
                <div className="p-1">
                  {filteredMaterials.map((material) => (
                    <button
                      key={material.id}
                      className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 text-left",
                        value === material.name && "bg-slate-50"
                      )}
                      onClick={() => {
                        onSelect(material);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === material.name ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{material.name}</span>
                        <span className="text-[10px] text-slate-500">{material.category} • {material.unitOfMeasure}</span>
                      </div>
                    </button>
                  ))}
                </div>
            )}
          </div>
          <div className="border-t p-1 bg-slate-50/50">
            <Button 
                variant="ghost" 
                className="w-full justify-start text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                onClick={() => {
                    setOpen(false);
                    setIsRequestModalOpen(true);
                }}
            >
              <PackagePlus className="mr-2 h-4 w-4" />
              Request New Purchase
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request New Purchase</DialogTitle>
            <DialogDescription>
              Material not in registry? Send a purchase request to the Store department.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Material Name</Label>
              <Input 
                id="name" 
                value={newRequest.name} 
                onChange={e => setNewRequest({...newRequest, name: e.target.value})} 
                placeholder="e.g. Silk Thread Gold #50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qty">Estimated Quantity Required</Label>
              <Input 
                id="qty" 
                type="number"
                value={newRequest.quantity} 
                onChange={e => setNewRequest({...newRequest, quantity: parseFloat(e.target.value)})} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason / Specifics</Label>
              <Input 
                id="reason" 
                value={newRequest.reason} 
                onChange={e => setNewRequest({...newRequest, reason: e.target.value})} 
                placeholder="Required for gold embroidery detailing"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestNew} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Fixed Send icon import
import { Send } from 'lucide-react';
