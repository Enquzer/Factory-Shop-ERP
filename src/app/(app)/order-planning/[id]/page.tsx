
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChevronLeft, 
  Package, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers, 
  Rocket,
  ArrowRight,
  Info,
  Calendar,
  Box,
  Truck,
  RefreshCw,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { MarketingOrder, getMarketingOrderById, updateMarketingOrder } from '@/lib/marketing-orders';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function OrderFulfillmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<MarketingOrder | null>(null);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const orderData = await getMarketingOrderById(id as string);
      if (!orderData) {
        toast({ title: "Error", description: "Order not found", variant: "destructive" });
        router.push('/order-planning');
        return;
      }
      setOrder(orderData);

      // Fetch requisitions
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const reqRes = await fetch(`/api/requisitions?orderId=${id}`, { headers });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequisitions(Array.isArray(reqData) ? reqData : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load fulfillment data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMaterials = async () => {
    if (!order) return;
    setIsUpdating(true);
    try {
      const success = await updateMarketingOrder(order.id, { isMaterialsConfirmed: true });
      if (success) {
        setOrder({ ...order, isMaterialsConfirmed: true });
        toast({ title: "Success", description: "Materials availability confirmed." });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to confirm materials", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReleaseToProduction = async () => {
    if (!order) return;
    if (!order.isMaterialsConfirmed) {
      toast({ title: "Notice", description: "Please confirm material availability before releasing.", variant: "destructive" });
      return;
    }

    setIsReleasing(true);
    try {
      const response = await fetch('/api/production-release', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          orderId: order.id,
          updates: {
             cuttingStartDate: order.cuttingStartDate || format(new Date(), 'yyyy-MM-dd'),
             sewingStartDate: order.sewingStartDate || format(new Date(), 'yyyy-MM-dd'),
             status: 'Cutting'
          }
        })
      });

      if (response.ok) {
        toast({ title: "Released!", description: "Order has been released to production floors." });
        router.push('/order-planning');
      } else {
        const err = await response.json();
        throw new Error(err.error || "Release failed");
      }
    } catch (error: any) {
      toast({ title: "Release Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsReleasing(false);
    }
  };

  const calculateReadyProgress = () => {
    if (requisitions.length === 0) return 0;
    const completed = requisitions.filter(r => r.status === 'Completed').length;
    return Math.round((completed / requisitions.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse text-lg font-medium">Loading fulfillment details...</p>
      </div>
    );
  }

  if (!user || (user.role !== 'factory' && user.role !== 'planning' && user.role !== 'marketing')) {
    return <div className="p-8 text-center font-bold text-red-600">Unauthorized Access</div>;
  }

  if (!order) return null;

  const readinessScore = calculateReadyProgress();

  return (
    <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500 max-w-[1400px] mx-auto">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="hover:bg-primary/10 text-primary -ml-4"
        >
          <ChevronLeft className="mr-2 h-5 w-5" />
          Back to Planning Sheet
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Last Updated: {format(new Date(order.updatedAt), 'dd MMM yyyy HH:mm')}
        </div>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
                  Order {order.orderNumber}
                </h1>
                <Badge className={cn(
                  "px-3 py-1 text-xs font-bold uppercase",
                  order.status === 'Planning' ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-blue-100 text-blue-700 border-blue-200"
                )}>
                  {order.status}
                </Badge>
              </div>
              <p className="text-xl text-muted-foreground font-medium">{order.productName} ({order.productCode})</p>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="relative pt-10 pb-4">
             <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-out" 
                  style={{ width: `${order.status === 'Planning' ? (order.isMaterialsConfirmed ? '75%' : '50%') : '100%'}` }} 
                />
             </div>
             <div className="relative flex justify-between">
                {[
                  { label: 'Booking', icon: Box, active: true },
                  { label: 'BOM Complete', icon: Layers, active: requisitions.length > 0 },
                  { label: 'Fulfillment', icon: Truck, active: readinessScore === 100 },
                  { label: 'Production', icon: Rocket, active: order.status !== 'Planning' }
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center z-10 border-4 transition-all duration-500",
                      step.active ? "bg-primary border-primary text-white scale-110 shadow-lg" : "bg-white border-slate-100 text-slate-300"
                    )}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest",
                      step.active ? "text-primary" : "text-slate-400"
                    )}>{step.label}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Variants Table Card */}
          <Card className="border-none shadow-xl bg-white/50 backdrop-blur-md">
            <CardHeader className="border-b bg-slate-50/50 py-4">
               <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Box className="h-4 w-4 text-blue-500" />
                  Order Breakdown & Variants
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow className="hover:bg-transparent">
                     <TableHead className="font-bold">Size</TableHead>
                     <TableHead className="font-bold">Color</TableHead>
                     <TableHead className="text-right font-bold">Quantity</TableHead>
                     <TableHead className="text-right font-bold">% of Total</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {order.items.map((item, idx) => (
                     <TableRow key={idx}>
                       <TableCell className="font-medium">{item.size}</TableCell>
                       <TableCell>
                          <div className="flex items-center gap-2">
                             <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: item.color.toLowerCase() }} />
                             {item.color}
                          </div>
                       </TableCell>
                       <TableCell className="text-right font-semibold">{item.quantity} pcs</TableCell>
                       <TableCell className="text-right text-muted-foreground text-xs">
                          {((item.quantity / order.quantity) * 100).toFixed(1)}%
                       </TableCell>
                     </TableRow>
                   ))}
                   <TableRow className="bg-slate-50/80 font-black">
                      <TableCell colSpan={2} className="text-sm uppercase tracking-thighter">Total Volume</TableCell>
                      <TableCell className="text-right text-lg">{order.quantity} pcs</TableCell>
                      <TableCell />
                   </TableRow>
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Package className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Fulfillment Status
              </CardTitle>
              <CardDescription className="text-slate-400">Current Material Readiness</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative h-32 w-32 flex items-center justify-center">
                     <svg className="h-full w-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          fill="transparent"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray={364}
                          strokeDashoffset={364 - ( readinessScore / 100) * 364}
                          className={cn(
                            "transition-all duration-1000 ease-in-out",
                            readinessScore === 100 ? "text-green-500" : "text-blue-500"
                          )}
                        />
                     </svg>
                     <span className="absolute text-3xl font-black">{readinessScore}%</span>
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Materials In-Store</p>
               </div>

               <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                     <span className="text-xs text-slate-400 font-medium">BOM Handed to Store</span>
                     {requisitions.length > 0 ? (
                       <CheckCircle2 className="h-4 w-4 text-green-500" />
                     ) : (
                       <Clock className="h-4 w-4 text-slate-600" />
                     )}
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                     <span className="text-xs text-slate-400 font-medium">Planning Confirmation</span>
                     {order.isMaterialsConfirmed ? (
                       <CheckCircle2 className="h-4 w-4 text-green-500" />
                     ) : (
                       <AlertCircle className="h-4 w-4 text-amber-500" />
                     )}
                  </div>
               </div>

               {!order.isMaterialsConfirmed ? (
                  <Button 
                    variant="default" 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold shadow-lg"
                    onClick={handleConfirmMaterials}
                    disabled={isUpdating || readinessScore < 100}
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                    Confirm Materials Ready
                  </Button>
               ) : (
                  <Button 
                    variant="default" 
                    className="w-full bg-green-600 hover:bg-green-700 h-12 font-bold shadow-lg"
                    onClick={handleReleaseToProduction}
                    disabled={isReleasing || order.status !== 'Planning'}
                  >
                    {isReleasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
                    Release to Production
                  </Button>
               )}
               
               {readinessScore < 100 && !order.isMaterialsConfirmed && (
                 <p className="text-[10px] text-center text-slate-500 italic">
                   * Confirmation enabled once store issues all materials.
                 </p>
               )}
            </CardContent>
          </Card>

          {order.imageUrl && (
            <Card className="overflow-hidden border-none shadow-lg group">
               <img 
                 src={order.imageUrl} 
                 alt="Product" 
                 className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700" 
               />
            </Card>
          )}

          <div className="p-4 bg-muted/40 rounded-xl border border-dashed border-muted-foreground/20 space-y-3">
             <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                <Info className="h-3 w-3" />
                Planning Policy
             </h4>
             <ul className="text-[10px] space-y-2 text-muted-foreground leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                   <ArrowRight className="h-2 w-2 mt-1 text-primary shrink-0" />
                   BOM must be generated and handed over to store first.
                </li>
                <li className="flex items-start gap-2">
                   <ArrowRight className="h-2 w-2 mt-1 text-primary shrink-0" />
                   Store must confirm physical issuance (100% fulfill).
                </li>
                <li className="flex items-start gap-2">
                   <ArrowRight className="h-2 w-2 mt-1 text-primary shrink-0" />
                   Planning user certifies readiness to unlock production floor.
                </li>
             </ul>
          </div>
        </div>
      </div>

      {/* Requisitions Detail Section */}
      <Card className="border-none shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                Material Fulfillment & Purchase Log
              </CardTitle>
              <CardDescription>Real-time sync with Store and Finance records.</CardDescription>
           </div>
           <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className="h-3 w-3" />
              Sync Status
           </Button>
        </CardHeader>
        <CardContent>
           <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold">Raw Material Name</TableHead>
                    <TableHead className="text-right font-bold">Req. Qty</TableHead>
                    <TableHead className="text-right font-bold">Issued</TableHead>
                    <TableHead className="text-right font-bold">Current Stock</TableHead>
                    <TableHead className="text-center font-bold">Store Status</TableHead>
                    <TableHead className="text-right font-bold">Link to Purchase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                         No requisitions found. Please generate BOM in the Planning Master Sheet.
                      </TableCell>
                    </TableRow>
                  ) : requisitions.map((req, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-semibold text-slate-700">
                         <div className="flex items-center gap-2">
                           <Layers className="h-4 w-4 text-slate-300" />
                           {req.materialName}
                         </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{req.quantityRequested.toFixed(2)} {req.unitOfMeasure}</TableCell>
                      <TableCell className="text-right font-black text-blue-600">{req.quantityIssued.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                         <Badge variant="secondary" className={cn(
                           "font-mono text-[10px]",
                           req.currentBalance < (req.quantityRequested - req.quantityIssued) ? "text-red-700 bg-red-50" : "text-emerald-700 bg-emerald-50"
                         )}>
                           {req.currentBalance?.toFixed(2) || '0.00'}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge 
                           className={cn(
                             "px-2 py-0.5 text-[10px] border-none font-bold",
                             req.status === 'Completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                           )}
                         >
                           {req.status === 'Completed' ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <Clock className="h-3 w-3 mr-1 inline" />}
                           {req.status.toUpperCase()}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         {req.purchaseStatus ? (
                           <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className={cn(
                                "text-[9px] border-dashed",
                                req.purchaseStatus === 'Received' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700"
                              )}>
                                {req.purchaseStatus}
                                {req.purchaseQuantity && <span className="ml-1 opacity-60">({req.purchaseQuantity})</span>}
                              </Badge>
                              <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-tighter">ID: {req.purchaseId}</span>
                           </div>
                         ) : (
                           <span className="text-xs text-muted-foreground/30 font-medium italic">Internal Stock</span>
                         )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pb-8">
         <Button variant="ghost" className="text-muted-foreground" onClick={() => router.push('/order-planning')}>
            Return to Dashboard
         </Button>
         <Button 
           variant="outline" 
           className="border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
           onClick={() => window.print()}
         >
            <FileText className="mr-2 h-4 w-4" />
            Download Status PDF
         </Button>
      </div>
    </div>
  );
}
