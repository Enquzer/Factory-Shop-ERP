'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  User,
  FileText,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export type PurchaseRequestWithDetails = {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Ordered' | 'Received' | 'Rejected';
  requesterId: string;
  requestedDate: Date;
  approvedDate?: Date;
  orderedDate?: Date;
  receivedDate?: Date;
  requesterUsername?: string;
  unitOfMeasure?: string;
  costPerUnit?: number;
  supplier?: string;
  rejectionReason?: string;
};

export default function FinancePurchaseRequestsPage() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestWithDetails | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | 'order' | 'receive' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [supplier, setSupplier] = useState('');

  // Check authentication
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/finance/login');
        return;
      }
      
      if (user.role !== 'finance') {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to access this page.", 
          variant: "destructive" 
        });
        router.push('/finance/dashboard');
        return;
      }
      
      fetchPurchaseRequests();
    }
  }, [user, authLoading, router, toast]);

  const fetchPurchaseRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/purchase-requests/finance', {
        headers
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching purchase requests:', error);
      toast({ title: "Error", description: error.message || "Failed to fetch purchase requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (request: PurchaseRequestWithDetails, action: 'approve' | 'reject' | 'order' | 'receive') => {
    setSelectedRequest(request);
    setDialogAction(action);
    setActionNotes('');
    setCostPerUnit(request.costPerUnit?.toString() || '');
    setSupplier(request.supplier || '');
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!selectedRequest || !dialogAction) return;

    // Map frontend action names to backend action names
    const actionMap: Record<string, string> = {
      'approve': 'Approved',
      'reject': 'Rejected',
      'order': 'Ordered',
      'receive': 'Received'
    };
    
    const backendAction = actionMap[dialogAction];
    if (!backendAction) {
      toast({ title: "Error", description: `Invalid action: ${dialogAction}`, variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const requestBody: any = {
        requestId: selectedRequest.id,
        action: backendAction,
        notes: actionNotes
      };
      
      if (dialogAction === 'approve') {
        requestBody.costPerUnit = parseFloat(costPerUnit) || 0;
        requestBody.supplier = supplier;
      }
      
      const res = await fetch('/api/purchase-requests/manage', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process request');
      }
      
      toast({ 
        title: "Success", 
        description: `Purchase request ${backendAction.toLowerCase()}d successfully` 
      });
      
      setActionDialogOpen(false);
      fetchPurchaseRequests();
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'Approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Approved</Badge>;
      case 'Ordered':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Ordered</Badge>;
      case 'Received':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Received</Badge>;
      case 'Rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTotalCost = (request: PurchaseRequestWithDetails) => {
    if (request.costPerUnit && request.quantity) {
      return (request.costPerUnit * request.quantity).toFixed(2);
    }
    return 'N/A';
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
  if (!user || user.role !== 'finance') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-blue-600" />
          Purchase Requests Management
        </h1>
        <p className="text-muted-foreground">Review and manage purchase requests from Store team.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cost Estimate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{request.materialName}</div>
                          <div className="text-sm text-muted-foreground">{request.reason}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{request.quantity} {request.unitOfMeasure || ''}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {request.requesterUsername || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(request.requestedDate), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.costPerUnit ? (
                        <div>
                          <div className="font-medium">{getTotalCost(request)} ETB</div>
                          <div className="text-sm text-muted-foreground">
                            {request.costPerUnit.toFixed(2)} ETB/unit
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {request.status === 'Pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleAction(request, 'approve')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleAction(request, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {request.status === 'Approved' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleAction(request, 'order')}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Mark Ordered
                          </Button>
                        )}
                        
                        {request.status === 'Ordered' && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleAction(request, 'receive')}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Mark Received
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approve' && 'Approve Purchase Request'}
              {dialogAction === 'reject' && 'Reject Purchase Request'}
              {dialogAction === 'order' && 'Mark as Ordered'}
              {dialogAction === 'receive' && 'Mark as Received'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <div className="mt-2 space-y-2">
                  <div><strong>Material:</strong> {selectedRequest.materialName}</div>
                  <div><strong>Quantity:</strong> {selectedRequest.quantity} {selectedRequest.unitOfMeasure || ''}</div>
                  <div><strong>Requester:</strong> {selectedRequest.requesterUsername || 'Unknown'}</div>
                  <div><strong>Reason:</strong> {selectedRequest.reason}</div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {(dialogAction === 'approve' || dialogAction === 'order') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="costPerUnit">Cost Per Unit (ETB)</Label>
                  <Input
                    id="costPerUnit"
                    type="number"
                    step="0.01"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    placeholder="Enter cost per unit"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={
                  dialogAction === 'reject' 
                    ? "Reason for rejection..." 
                    : "Additional notes..."
                }
                rows={3}
              />
            </div>
            
            {dialogAction === 'approve' && selectedRequest && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Estimated Total Cost: {getTotalCost(selectedRequest)} ETB</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={executeAction}
              variant={dialogAction === 'reject' ? 'destructive' : 'default'}
              className={dialogAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {dialogAction === 'approve' && 'Approve Request'}
              {dialogAction === 'reject' && 'Reject Request'}
              {dialogAction === 'order' && 'Mark as Ordered'}
              {dialogAction === 'receive' && 'Mark as Received'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}