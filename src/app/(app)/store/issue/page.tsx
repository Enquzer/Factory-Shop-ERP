
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { authenticatedFetch } from "@/lib/utils";
import { Loader2, CheckCircle, AlertCircle, ShoppingCart, Send, Layers, AlertTriangle, FileText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PadNumberDisplay } from "@/components/pad-number-display";
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function MaterialIssuancePage() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [issueQty, setIssueQty] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseReason, setPurchaseReason] = useState('');

  // Check authentication
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
        return;
      }
      
      // Ensure user is store or factory role
      if (user.role !== 'store' && user.role !== 'factory') {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to access this page.", 
          variant: "destructive" 
        });
        router.push('/store/dashboard');
        return;
      }
      
      fetchRequisitions();
    }
  }, [user, authLoading, router, toast]);

  // Remove the original useEffect since we moved the logic above

  const fetchRequisitions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast({ title: "Authentication Error", description: "Please log in again", variant: "destructive" });
        router.push('/');
        return;
      }
      
      // Add authorization header
      const res = await authenticatedFetch('/api/requisitions');
      
      if (!res.ok) {
        if (res.status === 401) {
          toast({ title: "Session Expired", description: "Please log in again", variant: "destructive" });
          logout();
          router.push('/');
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setRequisitions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching requisitions:', error);
      toast({ title: "Error", description: error.message || "Failed to fetch requisitions", variant: "destructive" });
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
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/requisitions/issue', {
        method: 'POST',
        headers,
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
        throw new Error(err.error || 'Failed to issue material');
      }
    } catch (error: any) {
      console.error('Error issuing material:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePurchaseRequest = async () => {
    if (!selectedReq) return;

    const shortfall = (selectedReq.quantityRequested - selectedReq.quantityIssued) - selectedReq.currentBalance;
    
    if (shortfall <= 0) {
      toast({ title: "No Shortfall", description: "Sufficient stock available", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          materialId: selectedReq.materialId,
          quantity: shortfall,
          reason: purchaseReason || `Shortfall for Order ${selectedReq.orderNumber} - ${selectedReq.productName}. Required: ${selectedReq.quantityRequested.toFixed(2)}, Available: ${selectedReq.currentBalance.toFixed(2)}`,
          orderId: selectedReq.orderId,
          requisitionId: selectedReq.id
        })
      });
      
      if (res.ok) {
        const result = await res.json();
        toast({ 
          title: "Purchase Request Created", 
          description: `Request for ${shortfall.toFixed(2)} ${selectedReq.unitOfMeasure} of ${selectedReq.materialName} sent to Finance for approval. Request ID: ${result.id || 'N/A'}` 
        });
        setShowPurchaseDialog(false);
        setPurchaseReason('');
        setSelectedReq(null);
        fetchRequisitions();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create purchase request');
      }
    } catch (error: any) {
      console.error('Error creating purchase request:', error);
      toast({ title: "Error", description: error.message || "Failed to create purchase request", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShortfall = (req: any) => {
    const remaining = req.quantityRequested - req.quantityIssued;
    return Math.max(0, remaining - req.currentBalance);
  };

  // Show loading state while checking auth
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not authenticated or not authorized, don't render
  if (!user || (user.role !== 'store' && user.role !== 'factory')) {
    return null;
  }

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
                  <TableHead>Pad Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No pending material requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  requisitions.map(req => {
                    const shortfall = getShortfall(req);
                    const hasShortfall = shortfall > 0;
                    
                    return (
                      <TableRow key={req.id} className={hasShortfall ? 'bg-red-50' : ''}>
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
                          <div className="flex flex-col gap-1">
                            <span className={req.currentBalance < (req.quantityRequested - req.quantityIssued) ? 'text-red-600 font-bold' : ''}>
                              {req.currentBalance.toFixed(2)}
                            </span>
                            {hasShortfall && (
                              <Badge variant="destructive" className="text-[10px] w-fit">
                                Short: {shortfall.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <PadNumberDisplay 
                            padNumber={req.padNumber}
                            type="material"
                            recordId={req.id}
                            editable={user?.role === 'store'}
                            className="text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={req.status === 'Pending' ? 'outline' : 'secondary'}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {req.currentBalance > 0 && (
                              <Dialog open={selectedReq?.id === req.id && !showPurchaseDialog} onOpenChange={(open) => !open && setSelectedReq(null)}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="default" onClick={() => {
                                      setSelectedReq(req);
                                      setIssueQty(Math.min(req.quantityRequested - req.quantityIssued, req.currentBalance));
                                  }}>
                                    <CheckCircle className="h-3 w-3 mr-1" />
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
                                        max={req.currentBalance}
                                      />
                                    </div>
                                    {hasShortfall && (
                                      <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                          Shortfall of {shortfall.toFixed(2)} {req.unitOfMeasure}. Create a purchase request after partial issuance.
                                        </AlertDescription>
                                      </Alert>
                                    )}
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
                            )}
                            
                            {hasShortfall && (
                              <Dialog open={showPurchaseDialog && selectedReq?.id === req.id} onOpenChange={(open) => {
                                setShowPurchaseDialog(open);
                                if (!open) setSelectedReq(null);
                              }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive" onClick={() => {
                                    setSelectedReq(req);
                                    setShowPurchaseDialog(true);
                                    setPurchaseReason(`Shortfall for Order ${req.orderNumber} - ${req.productName}`);
                                  }}>
                                    <FileText className="h-3 w-3 mr-1" />
                                    Purchase
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Create Purchase Request</DialogTitle>
                                    <DialogDescription>
                                      Submit a purchase request to Finance for material shortfall.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label className="text-right">Material</Label>
                                      <div className="col-span-3 font-semibold">{req.materialName}</div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label className="text-right">Order</Label>
                                      <div className="col-span-3">{req.orderNumber} - {req.productName}</div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label className="text-right">Required</Label>
                                      <div className="col-span-3">{(req.quantityRequested - req.quantityIssued).toFixed(2)} {req.unitOfMeasure}</div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label className="text-right">Available</Label>
                                      <div className="col-span-3 text-red-600 font-bold">{req.currentBalance.toFixed(2)} {req.unitOfMeasure}</div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label className="text-right">Shortfall</Label>
                                      <div className="col-span-3 text-red-600 font-bold text-lg">{shortfall.toFixed(2)} {req.unitOfMeasure}</div>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="reason">Reason / Notes</Label>
                                      <Textarea 
                                        id="reason"
                                        value={purchaseReason}
                                        onChange={e => setPurchaseReason(e.target.value)}
                                        placeholder="Additional details for finance team..."
                                        rows={3}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => {
                                      setShowPurchaseDialog(false);
                                      setSelectedReq(null);
                                    }}>Cancel</Button>
                                    <Button 
                                      onClick={handleCreatePurchaseRequest} 
                                      disabled={isSubmitting}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                      Submit to Finance
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
                        <h3 className="font-bold text-amber-900">Stock Warnings & Purchase Requests</h3>
                        <p className="text-sm text-amber-700 mt-1">If the requested quantity exceeds the stock balance, the row will be highlighted in red. You can perform "Part-Issuance" for available stock and create a "Purchase Request" for the shortfall, which will be sent to Finance for approval.</p>
                    </div>
                </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
