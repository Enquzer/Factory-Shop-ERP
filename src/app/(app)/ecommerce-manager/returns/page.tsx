"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  RotateCcw, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function EcommerceReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchReturns();
    }
  }, [token]);

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch('/api/ecommerce/returns?all=true', { headers });
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch return requests.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      setIsUpdating(true);
      const headers = { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
      };
      
      const response = await fetch(`/api/ecommerce/returns/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, adminNotes })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Return request marked as ${status}.`,
          className: "bg-green-600 text-white"
        });
        setSelectedReturn(null);
        setAdminNotes("");
        fetchReturns();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ret.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ret.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <RotateCcw className="h-8 w-8 text-orange-600" />
            Return Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and process customer return requests
          </p>
        </div>
        <Link href="/ecommerce-manager">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, Customer, or Order..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading return requests...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No return requests found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReturns.map((ret) => (
                <div key={ret.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{ret.id}</span>
                        {getStatusBadge(ret.status)}
                      </div>
                      <div className="text-sm font-medium">
                        Order: <span className="text-blue-600">#{ret.orderId.split('-').pop()}</span> • 
                        Customer: <span className="text-slate-900">{ret.customerName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Requested on {format(new Date(ret.createdAt), 'PPpp')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedReturn(ret);
                          setAdminNotes(ret.adminNotes || "");
                        }}
                      >
                        Review Claim
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-slate-100 rounded-lg text-sm border-l-4 border-orange-500">
                    <p className="font-bold text-orange-800 uppercase text-[10px] mb-1">Reason: {ret.reason.replace('_', ' ')}</p>
                    <p className="text-slate-700 italic">"{ret.explanation || "No additional explanation provided."}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Return Request: {selectedReturn?.id}</DialogTitle>
            <DialogDescription>
              Process the return claim for {selectedReturn?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedReturn.customerName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-medium">#{selectedReturn.orderId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium uppercase text-orange-600">{selectedReturn.reason.replace('_', ' ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Current Status</p>
                  <div>{getStatusBadge(selectedReturn.status)}</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border">
                <p className="text-sm font-bold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  Items in Return Request:
                </p>
                <div className="space-y-2">
                  {JSON.parse(selectedReturn.items).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-dashed border-slate-200 last:border-0">
                      <span>{item.name} ({item.size})</span>
                      <span className="font-bold">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Management Notes (Visible to Customer)</Label>
                <Textarea 
                  id="adminNotes"
                  placeholder="Explain why the return was approved or rejected..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white" 
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedReturn.id, 'approved')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve Return
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white" 
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedReturn.id, 'rejected')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Claim
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white" 
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedReturn.id, 'completed')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark as Completed
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReturn(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
