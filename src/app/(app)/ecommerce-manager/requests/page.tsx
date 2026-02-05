"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  User, 
  ExternalLink,
  Loader2,
  RefreshCcw,
  Sparkles,
  DollarSign,
  AlertTriangle,
  XCircle,
  ImageIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type RareRequest = {
  id: string;
  customerId: string;
  customerName: string;
  productName: string;
  description: string;
  budget?: string;
  urgency: 'low' | 'normal' | 'high';
  imageUrl?: string;
  status: 'pending' | 'reviewed' | 'fulfilled' | 'rejected';
  createdAt: string;
};

export default function RareRequestsPage() {
  const [requests, setRequests] = useState<RareRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed" | "fulfilled" | "rejected">("all");
  const { toast } = useToast();
  
  const [selectedRequest, setSelectedRequest] = useState<RareRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ecommerce-manager/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({ title: "Error", description: "Failed to load requests.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedRequest) return;
    
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ecommerce-manager/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: newStatus
        })
      });
      
      if (response.ok) {
        toast({ title: "Updated", description: `Request marked as ${newStatus}.`, className: "bg-green-600 text-white" });
        setIsDialogOpen(false);
        fetchRequests();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">High Urgency</Badge>;
      case 'low': return <Badge variant="outline" className="text-gray-500">Low Priority</Badge>;
      default: return <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">Normal</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'reviewed': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'fulfilled': return 'bg-green-50 text-green-700 border-green-200';
        case 'rejected': return 'bg-gray-100 text-gray-500 border-gray-200';
        default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            Rare Product Requests
          </h1>
          <p className="text-gray-500">Manage custom find requests from customers.</p>
        </div>
        <Button onClick={fetchRequests} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 px-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search requests..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              {['all', 'pending', 'reviewed', 'fulfilled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === status 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p>Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No requests found.</p>
            </div>
          ) : (
            <div className="divide-y border-t">
              {filteredRequests.map((req) => (
                <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image Thumbnail */}
                    <div className="w-full md:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        {req.imageUrl ? (
                            <img src={req.imageUrl} alt={req.productName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <ImageIcon className="h-8 w-8" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{req.productName}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <User className="h-3 w-3" /> {req.customerName}
                                    <span className="text-gray-300">•</span>
                                    <Clock className="h-3 w-3" /> {format(new Date(req.createdAt), 'MMM d, yyyy')}
                                </div>
                            </div>
                            <Badge className={`${getStatusColor(req.status)} uppercase text-[10px]`}>
                                {req.status}
                            </Badge>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>
                        
                        <div className="flex gap-3 pt-2">
                            {req.budget && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <DollarSign className="h-3 w-3 mr-1" /> Budget: {req.budget}
                                </Badge>
                            )}
                            {getUrgencyBadge(req.urgency)}
                        </div>
                    </div>

                    <div className="flex flex-col justify-center gap-2 min-w-[120px]">
                         <Dialog open={isDialogOpen && selectedRequest?.id === req.id} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (open) setSelectedRequest(req);
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="default" size="sm" className="w-full bg-slate-900">
                                    Review Deal
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                    <DialogTitle>Review Rare Request</DialogTitle>
                                    <DialogDescription>Request ID: {selectedRequest?.id}</DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                    <div className="space-y-4">
                                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            {selectedRequest?.imageUrl ? (
                                                <img src={selectedRequest.imageUrl} alt="Reference" className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                                    <ImageIcon className="h-12 w-12 mb-2" />
                                                    <span className="text-xs">No image provided</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs text-gray-500 uppercase font-bold">Product</Label>
                                            <p className="font-bold text-lg">{selectedRequest?.productName}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500 uppercase font-bold">Description</Label>
                                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1 max-h-[150px] overflow-y-auto">
                                                {selectedRequest?.description}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs text-gray-500 uppercase font-bold">Budget</Label>
                                                <p className="font-medium text-green-700">{selectedRequest?.budget || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500 uppercase font-bold">Customer</Label>
                                                <p className="font-medium">{selectedRequest?.customerName}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="flex-col sm:flex-row gap-2">
                                    <div className="flex-1 flex gap-2">
                                        <Select 
                                            value={selectedRequest?.status} 
                                            onValueChange={(val) => handleStatusUpdate(val)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Update Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Mark as Pending</SelectItem>
                                                <SelectItem value="reviewed">Mark as Reviewed</SelectItem>
                                                <SelectItem value="fulfilled">Mark as Fulfilled (Found)</SelectItem>
                                                <SelectItem value="rejected">Reject Request</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Close
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
