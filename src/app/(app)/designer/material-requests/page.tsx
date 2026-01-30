"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Calendar,
  CheckCircle,
  ShoppingCart,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MaterialRequest {
  id: string;
  materialName: string;
  quantity: number;
  reason: string;
  status: string;
  requestedDate: string;
  fulfilledDate: string | null;
  purchaseRequestId: string | null;
}

export default function DesignerMaterialRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      const res = await fetch('/api/designer/material-requests', {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Fulfilled':
        return <Badge variant="default" className="bg-green-100 text-green-800">Fulfilled</Badge>;
      case 'Purchase Requested':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Purchase Requested</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
          <p className="mt-4 text-gray-600">Loading your material requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Material Requests</h1>
        <p className="text-gray-600">View the status of your material requests to the Store department</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2 text-gray-500" />
            Material Requests History ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No material requests yet</h3>
              <p className="text-gray-500">
                You haven't submitted any material requests. Use the material selector in your workspace to request materials.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Fulfilled Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{request.materialName}</div>
                      </TableCell>
                      <TableCell className="font-medium">{request.quantity}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-gray-600 truncate" title={request.reason}>
                          {request.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                          {request.status === 'Pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                          {request.status === 'Fulfilled' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {request.status === 'Purchase Requested' && <ShoppingCart className="h-4 w-4 text-blue-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(request.requestedDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.fulfilledDate ? (
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(request.fulfilledDate)}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
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

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Workflow Information</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Pending:</strong> Store department is reviewing your request</li>
          <li>• <strong>Fulfilled:</strong> Store has provided the materials from inventory</li>
          <li>• <strong>Purchase Requested:</strong> Store has created a purchase request for Finance</li>
        </ul>
      </div>
    </div>
  );
}