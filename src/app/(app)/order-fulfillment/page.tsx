
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Loader2, 
  Search, 
  Rocket, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  Package,
  ShoppingCart,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarketingOrder, getMarketingOrders } from '@/lib/marketing-orders';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function OrderFulfillmentListPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Confirmed' | 'Pending'>('All');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await getMarketingOrders();
      // Filter for orders that are in Planning or Placed status
      const relevantOrders = allOrders.filter(o => 
        ['Placed Order', 'Planning'].includes(o.status)
      );
      setOrders(relevantOrders);
    } catch (error) {
       console.error(error);
       toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'Confirmed') return matchesSearch && order.isMaterialsConfirmed;
    if (filterStatus === 'Pending') return matchesSearch && !order.isMaterialsConfirmed;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Loading Fulfillment Center...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
            <Rocket className="h-10 w-10 text-primary" />
            ORDER FULFILLMENT CENTER
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Centrally manage and confirm material readiness for all production-bound orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={fetchOrders} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card className="border-none shadow-xl bg-blue-50/50">
            <CardContent className="p-6">
               <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Total Tracked</p>
               <h3 className="text-3xl font-black text-slate-900">{orders.length}</h3>
            </CardContent>
         </Card>
         <Card className="border-none shadow-xl bg-orange-50/50">
            <CardContent className="p-6">
               <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Materials Pending</p>
               <h3 className="text-3xl font-black text-slate-900">{orders.filter(o => !o.isMaterialsConfirmed).length}</h3>
            </CardContent>
         </Card>
         <Card className="border-none shadow-xl bg-green-50/50">
            <CardContent className="p-6">
               <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Ready for Prod</p>
               <h3 className="text-3xl font-black text-slate-900">{orders.filter(o => o.isMaterialsConfirmed).length}</h3>
            </CardContent>
         </Card>
         <Card className="border-none shadow-xl bg-slate-100">
            <CardContent className="p-6">
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Lead Time</p>
               <h3 className="text-3xl font-black text-slate-900">4.2 Days</h3>
            </CardContent>
         </Card>
      </div>

      <Card className="border-none shadow-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <CardTitle className="text-xl font-bold">Fulfillment Status Queue</CardTitle>
                <CardDescription>Track material status, BOM completion, and store issuances.</CardDescription>
             </div>
             <div className="flex items-center gap-3">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input 
                      placeholder="Search Order # or Product..." 
                      className="pl-10 w-[250px] bg-white border-slate-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                <div className="flex border rounded-md p-1 bg-white">
                   {(['All', 'Confirmed', 'Pending'] as const).map(s => (
                      <Button 
                        key={s}
                        variant={filterStatus === s ? 'default' : 'ghost'} 
                        size="sm" 
                        className="h-8 text-[10px] font-bold uppercase transition-all"
                        onClick={() => setFilterStatus(s)}
                      >
                         {s}
                      </Button>
                   ))}
                </div>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 hover:bg-slate-50">
              <TableRow>
                <TableHead className="font-bold py-4">Order Details</TableHead>
                <TableHead className="font-bold">Product</TableHead>
                <TableHead className="text-center font-bold">Volume</TableHead>
                <TableHead className="font-bold">Planned Start</TableHead>
                <TableHead className="text-center font-bold">Fulfillment</TableHead>
                <TableHead className="text-right font-bold pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                     <div className="flex flex-col items-center justify-center gap-2 opacity-30">
                        <Package className="h-12 w-12" />
                        <p className="font-bold uppercase tracking-widest text-sm">No orders found in queue</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.map((order) => (
                <TableRow key={order.id} className="group hover:bg-slate-50/80 transition-all cursor-pointer" onClick={() => router.push(`/order-planning/${order.id}`)}>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-sm tracking-tight text-slate-900">{order.orderNumber}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(order.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {order.imageUrl ? (
                        <div className="h-10 w-10 rounded-lg overflow-hidden border shadow-sm shrink-0">
                           <img src={order.imageUrl} className="h-full w-full object-cover" alt="" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                           <Package className="h-5 w-5 text-slate-300" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{order.productName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono">{order.productCode}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-700">{order.quantity} pcs</TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                        <Clock className="h-3 w-3 text-primary" />
                        {order.cuttingStartDate ? format(new Date(order.cuttingStartDate), 'dd MMM') : 'Unscheduled'}
                     </div>
                  </TableCell>
                  <TableCell className="text-center">
                     {order.isMaterialsConfirmed ? (
                       <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 font-bold text-[10px] uppercase">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Materials Ready
                       </Badge>
                     ) : (
                       <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-50 px-3 py-1 font-bold text-[10px] uppercase">
                             <Clock className="h-3 w-3 mr-1" />
                             Fulfillment Pending
                          </Badge>
                          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-amber-400 w-1/2 animate-pulse" />
                          </div>
                       </div>
                     )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                     <Button variant="ghost" size="sm" className="group-hover:translate-x-1 transition-transform">
                        Verify Center
                        <ChevronRight className="h-4 w-4 ml-1" />
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="p-6 bg-slate-900 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Rocket className="h-40 w-40" />
         </div>
         <div className="space-y-1 z-10">
            <h4 className="text-xl font-black">Ready to release orders?</h4>
            <p className="text-slate-400 text-sm font-medium">Head to the Order Planning sheet to schedule floor operations after fulfillment is complete.</p>
         </div>
         <Button 
            className="bg-white text-slate-900 hover:bg-slate-100 font-bold z-10 shadow-lg"
            onClick={() => router.push('/order-planning')}
         >
            Go to Planning Sheet
            <ArrowRight className="h-4 w-4 ml-2" />
         </Button>
      </div>
    </div>
  );
}
