
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Layers, CheckCircle, Clock, RefreshCw } from "lucide-react";

interface Requisition {
  id: string;
  materialName: string;
  quantityRequested: number;
  quantityIssued: number;
  status: string;
  unitOfMeasure: string;
  issuedDate?: string;
}

interface MaterialRequisitionsDialogProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialRequisitionsDialog({ orderId, orderNumber, isOpen, onOpenChange }: MaterialRequisitionsDialogProps) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchRequisitions();
    }
  }, [isOpen, orderId]);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requisitions?orderId=${orderId}`);
      const data = await res.json();
      setRequisitions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed': return <Badge className="bg-green-100 text-green-700 border-none"><CheckCircle className="h-3 w-3 mr-1" /> Fully Issued</Badge>;
      case 'Part-Issued': return <Badge className="bg-blue-100 text-blue-700 border-none"><Clock className="h-3 w-3 mr-1" /> Partial</Badge>;
      default: return <Badge variant="outline" className="text-slate-500 border-slate-200">Pending</Badge>;
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/requisitions/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ orderId })
      });
      
      if (res.ok) {
        fetchRequisitions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to generate requisitions');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex justify-between items-center pr-8">
            <div>
              <DialogTitle>Material Requisitions - {orderNumber}</DialogTitle>
              <DialogDescription>
                View and manage raw materials requested from the store.
              </DialogDescription>
            </div>
            <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || loading}
                size="sm"
                variant="outline"
                className="hover:bg-primary/5 border-primary/20 text-primary"
            >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                {requisitions.length > 0 ? 'Update from BOM' : 'Generate from BOM'}
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : requisitions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground bg-slate-50 rounded-lg border border-dashed text-sm">
            No material requisitions found for this order. 
            Ensure the order is in Planning stage and has a BOM defined.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden mt-4">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Raw Material</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-right">Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3 text-slate-400" />
                            {req.materialName}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">{req.quantityRequested.toFixed(2)} {req.unitOfMeasure}</TableCell>
                    <TableCell className="text-right font-bold">{req.quantityIssued.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {req.issuedDate ? new Date(req.issuedDate).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
