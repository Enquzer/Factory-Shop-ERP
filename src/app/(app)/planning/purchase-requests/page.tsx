"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export type PlanningPurchaseRequest = {
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
  notes?: string;
};

export default function PlanningPurchaseRequestsPage() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PlanningPurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Ensure user is planning role
      if (user.role !== 'planning') {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to access this page.", 
          variant: "destructive" 
        });
        router.push('/production-dashboard');
        return;
      }
      
      fetchMyPurchaseRequests();
    }
  }, [user, authLoading, router, toast]);

  const fetchMyPurchaseRequests = async () => {
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
      
      // Fetch only requests made by this user
      const res = await fetch(`/api/purchase-requests/my-requests`, {
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

  const getTotalCost = (request: PlanningPurchaseRequest) => {
    if (request.costPerUnit && request.quantity) {
      return (request.costPerUnit * request.quantity).toFixed(2);
    }
    return 'N/A';
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
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
  if (!user || user.role !== 'planning') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Purchase Requests</h1>
          <p className="text-muted-foreground">
            Track the status of your purchase requests for production materials
          </p>
        </div>
        <Button onClick={fetchMyPurchaseRequests} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Request Status</CardTitle>
          <CardDescription>
            View and track all purchase requests submitted by you for production needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No purchase requests found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Submit purchase requests from the Material Requests page when you need materials for production orders.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.materialName}
                        <div className="text-sm text-muted-foreground">
                          {request.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.quantity} {request.unitOfMeasure || 'units'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {request.supplier || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {request.status === 'Approved' || request.status === 'Ordered' || request.status === 'Received' 
                          ? `${getTotalCost(request)} ETB` 
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatDate(request.requestedDate)}
                      </TableCell>
                      <TableCell>
                        {request.receivedDate ? formatDate(request.receivedDate) :
                         request.orderedDate ? formatDate(request.orderedDate) :
                         request.approvedDate ? formatDate(request.approvedDate) :
                         formatDate(request.requestedDate)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {request.rejectionReason && (
                            <div className="text-red-600 text-sm">
                              <strong>Rejection:</strong> {request.rejectionReason}
                            </div>
                          )}
                          {request.notes && (
                            <div className="text-sm text-muted-foreground">
                              {request.notes}
                            </div>
                          )}
                          {!request.rejectionReason && !request.notes && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
              <span className="text-sm text-muted-foreground">Awaiting Finance review</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Approved</Badge>
              <span className="text-sm text-muted-foreground">Finance has approved the request</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Ordered</Badge>
              <span className="text-sm text-muted-foreground">Purchase order sent to supplier</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Received</Badge>
              <span className="text-sm text-muted-foreground">Materials received and stocked</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
              <span className="text-sm text-muted-foreground">Request declined by Finance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}