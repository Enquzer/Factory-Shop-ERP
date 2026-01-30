"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Package, 
  User, 
  Calendar,
  CheckCircle,
  ShoppingCart,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MaterialRequest {
  id: string;
  requesterId: string;
  materialName: string;
  quantity: number;
  reason: string;
  projectId: string | null;
  status: string;
  requestedDate: string;
  fulfilledDate: string | null;
  purchaseRequestId: string | null;
  requesterName: string;
  requesterRole: string;
}

export default function StoreMaterialRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Processing dialog state
  const [processingRequest, setProcessingRequest] = useState<MaterialRequest | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processAction, setProcessAction] = useState<'fulfill' | 'purchase' | null>(null);
  const [quantityFulfilled, setQuantityFulfilled] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchMaterialRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm]);

  const fetchMaterialRequests = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const res = await fetch('/api/store/material-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch material requests');
      }
      
      const data = await res.json();
      setRequests(data);
    } catch (error: any) {
      console.error('Error fetching material requests:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch material requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    if (!searchTerm) {
      setFilteredRequests(requests);
      return;
    }
    
    const filtered = requests.filter(request => 
      request.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredRequests(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Fulfilled':
        return <Badge variant="default" className="bg-green-100 text-green-800">Fulfilled</Badge>;
      case 'Purchase Requested':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Purchase Requested</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleProcessRequest = (request: MaterialRequest, action: 'fulfill' | 'purchase') => {
    setProcessingRequest(request);
    setProcessAction(action);
    setQuantityFulfilled(request.quantity);
    setIsProcessDialogOpen(true);
  };

  const handleConfirmProcess = async () => {
    if (!processingRequest || !processAction) return;
    
    setIsProcessing(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const res = await fetch('/api/store/material-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: processingRequest.id,
          action: processAction,
          quantityFulfilled: processAction === 'fulfill' ? quantityFulfilled : undefined,
          createPurchaseRequest: processAction === 'purchase'
        })
      });
      
      const result = await res.json();
      
      if (res.ok) {
        toast({
          title: "Success",
          description: result.message
        });
        
        // Refresh the requests list
        await fetchMaterialRequests();
        setIsProcessDialogOpen(false);
        setProcessingRequest(null);
        setProcessAction(null);
      } else {
        throw new Error(result.error || 'Failed to process request');
      }
    } catch (error: any) {
      console.error('Error processing request:', error);
      // Log the actual URL that was called for debugging
      console.log('Called URL:', '/api/store/material-requests');
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading material requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Material Requests</h1>
        <p className="text-gray-600">Manage material requests from designers and other departments</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-gray-500" />
            Search Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by material name, requester, or request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2 text-gray-500" />
            Pending Material Requests ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No material requests found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search criteria' : 'There are currently no pending material requests'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.materialName}</div>
                          {request.projectId && (
                            <div className="text-xs text-gray-500">Project: {request.projectId}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <div>
                            <div className="font-medium">{request.requesterName}</div>
                            <div className="text-xs text-gray-500 capitalize">{request.requesterRole}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{request.quantity}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-gray-600 truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(request.requestedDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcessRequest(request, 'fulfill')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Fulfill
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleProcessRequest(request, 'purchase')}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" />
                              Purchase
                            </Button>
                          </div>
                        )}
                        {request.status === 'Fulfilled' && (
                          <div className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Completed
                          </div>
                        )}
                        {request.status === 'Purchase Requested' && (
                          <div className="text-sm text-blue-600 flex items-center">
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            In Progress
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Request Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {processAction === 'fulfill' ? 'Fulfill Request' : 'Create Purchase Request'}
            </DialogTitle>
            <DialogDescription>
              {processAction === 'fulfill' 
                ? 'Fulfill this request from existing inventory' 
                : 'Create a purchase request for this material'}
            </DialogDescription>
          </DialogHeader>
          
          {processingRequest && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Material</Label>
                <div className="font-medium">{processingRequest.materialName}</div>
              </div>
              
              <div className="grid gap-2">
                <Label>Requested Quantity</Label>
                <div className="font-medium">{processingRequest.quantity}</div>
              </div>
              
              {processAction === 'fulfill' && (
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity to Fulfill</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantityFulfilled}
                    onChange={(e) => setQuantityFulfilled(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={processingRequest.quantity}
                  />
                </div>
              )}
              
              <div className="grid gap-2">
                <Label>Reason</Label>
                <div className="text-sm text-gray-600">{processingRequest.reason}</div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProcessDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmProcess}
              disabled={isProcessing}
              variant={processAction === 'fulfill' ? 'default' : 'default'}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : processAction === 'fulfill' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Fulfill Request
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Purchase Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}