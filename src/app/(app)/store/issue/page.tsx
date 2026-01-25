
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, ShoppingCart, Send, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function MaterialIssuancePage() {
  const { toast } = useToast();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [issueQty, setIssueQty] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requisitions');
      const data = await res.json();
      setRequisitions(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch requisitions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!selectedReq || issueQty <= 0) return;
    
    if (issueQty > selectedReq.currentBalance) {
      toast({ title: "Insufficient Stock", description: "Cannot issue more than current balance", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/requisitions/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitionId: selectedReq.id,
          quantity: issueQty
        })
      });
      
      if (res.ok) {
        toast({ title: "Success", description: "Material issued successfully" });
        setSelectedReq(null);
        fetchRequisitions();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
            Material Issuance (Store Issue Requests)
        </h1>
        <p className="text-muted-foreground">Approve and fulfill material requests from the production department.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Materials requested by Planning team for production orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Req. Qty</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Stock Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No pending material requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  requisitions.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-bold">{req.orderNumber}</TableCell>
                      <TableCell>{req.productName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3 text-slate-400" />
                            {req.materialName}
                        </div>
                      </TableCell>
                      <TableCell>{req.quantityRequested.toFixed(2)} {req.unitOfMeasure}</TableCell>
                      <TableCell>{req.quantityIssued.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={req.currentBalance < (req.quantityRequested - req.quantityIssued) ? 'text-red-600 font-bold' : ''}>
                          {req.currentBalance.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={req.status === 'Pending' ? 'outline' : 'secondary'}>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-black">
                        <Dialog open={selectedReq?.id === req.id} onOpenChange={(open) => !open && setSelectedReq(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => {
                                setSelectedReq(req);
                                setIssueQty(req.quantityRequested - req.quantityIssued);
                            }}>
                              Issue
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Issue Material</DialogTitle>
                              <DialogDescription>
                                Confirm quantity to be issued from stock for Order {req.orderNumber}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Material</Label>
                                <div className="col-span-3 font-semibold">{req.materialName}</div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Remaining</Label>
                                <div className="col-span-3">{(req.quantityRequested - req.quantityIssued).toFixed(2)} {req.unitOfMeasure}</div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Available</Label>
                                <div className={`col-span-3 font-bold ${req.currentBalance < 1 ? 'text-red-600' : 'text-green-600'}`}>
                                  {req.currentBalance.toFixed(2)} {req.unitOfMeasure}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="qty" className="text-right text-black">Issue Qty</Label>
                                <Input 
                                  id="qty" 
                                  type="number" 
                                  value={issueQty} 
                                  onChange={e => setIssueQty(parseFloat(e.target.value))}
                                  className="col-span-3"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSelectedReq(null)}>Cancel</Button>
                              <Button 
                                onClick={handleIssue} 
                                disabled={isSubmitting || issueQty <= 0 || issueQty > req.currentBalance}
                              >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                Confirm Issuance
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-blue-50 border-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-900">How it works</h3>
                        <p className="text-sm text-blue-700 mt-1">Requisitions are automatically generated when an order enters the Planning stage based on the Product BOM. Store users must verify physical stock and log the issuance here.</p>
                    </div>
                </div>
              </CardContent>
          </Card>
          
          <Card className="bg-amber-50 border-amber-100">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                    <div className="bg-amber-600 p-2 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900">Stock Warnings</h3>
                        <p className="text-sm text-amber-700 mt-1">If the requested quantity exceeds the stock balance, the row will be highlighted. You can perform "Part-Issuance" if only partial stock is available.</p>
                    </div>
                </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
