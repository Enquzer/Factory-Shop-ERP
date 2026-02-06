"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  User, 
  Package, 
  ExternalLink,
  MessageCircle,
  Loader2,
  RefreshCcw,
  Reply,
  Send,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SupportTicket = {
  id: string;
  orderId: string;
  customerId: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  reply?: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
};

export default function SupportManagementPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const { toast } = useToast();
  const { token } = useAuth();
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchTickets = async () => {
    if (!token) {
      console.log('No token available, skipping fetch');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Token retrieved:', token ? 'Token exists' : 'No token found');
      
      const response = await fetch('/api/ecommerce-manager/support', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      } else if (response.status === 401) {
        const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
        console.error('401 Unauthorized:', errorData);
        toast({ 
          title: "Authentication Failed", 
          description: "Your session may have expired or you don't have permission. Please log in again.", 
          variant: "destructive" 
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        toast({ 
          title: "Error", 
          description: `Failed to load support tickets: ${errorData.error}`, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({ title: "Error", description: "Failed to load support tickets.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTickets();
    }
  }, [token]);

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    
    if (!token) {
      toast({ 
        title: "Authentication Error", 
        description: "No authentication token found. Please log in again.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ecommerce-manager/support', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedTicket.id,
          reply: replyText,
          status: 'closed' // Auto-close on reply for this workflow
        })
      });
      
      if (response.ok) {
        toast({ title: "Reply Sent", description: "Ticket has been updated and closed.", className: "bg-green-600 text-white" });
        setIsDialogOpen(false);
        setReplyText("");
        fetchTickets();
      } else if (response.status === 401) {
        const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
        console.error('401 Unauthorized:', errorData);
        toast({ 
          title: "Authentication Failed", 
          description: "Your session may have expired. Please log in again.", 
          variant: "destructive" 
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast({ 
          title: "Error", 
          description: `Failed to send reply: ${errorData.error}`, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ticket.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-orange-600" />
            Support Claims
          </h1>
          <p className="text-gray-500">Manage customer messages and resolve order claims.</p>
        </div>
        <Button onClick={fetchTickets} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 px-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by Order ID, Subject, or Customer..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={statusFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >All</Button>
                <Button 
                  variant={statusFilter === 'open' ? 'default' : 'outline'} 
                  size="sm"
                  className={statusFilter === 'open' ? 'bg-blue-600' : ''}
                  onClick={() => setStatusFilter('open')}
                >Open</Button>
                <Button 
                  variant={statusFilter === 'closed' ? 'default' : 'outline'} 
                  size="sm"
                  className={statusFilter === 'closed' ? 'bg-green-600' : ''}
                  onClick={() => setStatusFilter('closed')}
                >Closed</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <p>Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No support claims found matching your criteria.</p>
              </div>
            ) : (
              <div className="divide-y border-t">
                {filteredTickets.map((ticket) => (
                  <div key={ticket.id} className={`p-4 hover:bg-gray-50 transition-colors ${ticket.status === 'open' ? 'bg-blue-50/10' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{ticket.subject}</h3>
                          <Badge variant={ticket.status === 'open' ? 'outline' : 'default'} className={ticket.status === 'open' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'bg-green-600'}>
                            {ticket.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {ticket.orderId.split('-').pop()}</span>
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {ticket.customerName || ticket.customerId}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                          {ticket.message}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Dialog open={isDialogOpen && selectedTicket?.id === ticket.id} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (open) setSelectedTicket(ticket);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant={ticket.status === 'open' ? 'default' : 'outline'} className={ticket.status === 'open' ? 'bg-blue-600 hover:bg-blue-700' : ''}>
                              {ticket.status === 'open' ? <><Reply className="h-4 w-4 mr-2" /> Reply</> : "View Details"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Handle Support Ticket</DialogTitle>
                              <DialogDescription>
                                Customer Claim for Order #{selectedTicket?.orderId.split('-').pop()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Customer Message</span>
                                <h4 className="font-bold mb-1">{selectedTicket?.subject}</h4>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {selectedTicket?.message}
                                </p>
                              </div>
                              
                              {selectedTicket?.reply && (
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                  <span className="text-[10px] font-bold text-green-600 uppercase">Your Previous Reply</span>
                                  <p className="text-sm text-green-800 leading-relaxed">
                                    {selectedTicket.reply}
                                  </p>
                                </div>
                              )}

                              {selectedTicket?.status === 'open' && (
                                <div className="space-y-2">
                                  <Label htmlFor="reply-text">Your Reply / Resolution</Label>
                                  <Textarea 
                                    id="reply-text" 
                                    placeholder="Type your resolution or reply here..." 
                                    className="min-h-[150px]"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                  />
                                  <p className="text-[10px] text-gray-400 italic">Sending a reply will automatically close this ticket and notify the customer.</p>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                                {selectedTicket?.status === 'open' ? (
                                    <Button onClick={handleReply} disabled={isSubmitting || !replyText.trim()} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                        Send Reply & Close
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Close</Button>
                                )}
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Link href={`/ecommerce-manager/orders?search=${ticket.orderId}`}>
                          <Button size="sm" variant="ghost" className="text-xs h-8">
                             View Order <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Support Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                  <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Tickets Pending</p>
                  <p className="text-2xl font-black text-blue-900">{tickets.filter(t => t.status === 'open').length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-200" />
              </div>
              <div className="flex justify-between items-center bg-green-50 p-4 rounded-xl border border-green-100">
                <div>
                  <p className="text-green-600 text-xs font-bold uppercase tracking-wider">Resolved Cases</p>
                  <p className="text-2xl font-black text-green-900">{tickets.filter(t => t.status === 'closed').length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-gray-900 to-slate-800 text-white border-none shadow-xl overflow-hidden">
             <div className="absolute top-0 right-0 -mr-6 -mt-6 h-24 w-24 bg-orange-600/20 rounded-full blur-2xl"></div>
             <CardContent className="p-6 relative z-10">
                <h4 className="font-bold flex items-center gap-2 mb-2">
                   <Info className="h-4 w-4 text-orange-400" />
                   Quick Guide
                </h4>
                <ul className="text-xs space-y-2 opacity-80 leading-relaxed">
                   <li>• Open tickets highlight urgent customer issues.</li>
                   <li>• Replying to a ticket auto-closes the claim.</li>
                   <li>• Customers see your reply in their order history.</li>
                   <li>• Use the 'View Order' link to check transaction logs before replying.</li>
                </ul>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
