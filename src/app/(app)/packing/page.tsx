"use client";

import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMarketingOrders, updateMarketingOrder, MarketingOrder, handoverOrder } from '@/lib/marketing-orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, TrendingUp, CheckCircle, Clock, ArrowRight, Image as ImageIcon, LayoutDashboard, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DailyProductionForm } from '@/components/daily-production-form';

export default function PackingDashboardPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [totalProducedMap, setTotalProducedMap] = useState<Record<string, number>>({});

  // Check if user has packing or finishing role, otherwise redirect
  useEffect(() => {
    const allowedRoles = ['packing', 'finishing', 'quality_inspection', 'factory'];
    if (!isLoading && (!user || !allowedRoles.includes(user.role))) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const fetchedOrders = await getMarketingOrders();
      // Show orders relevant to Finishing through Packing
      const relevantStatuses = ['Finishing', 'Quality Inspection', 'Packing', 'Delivery'];
      const packingOrders = fetchedOrders.filter(order => 
        relevantStatuses.includes(order.status) && !order.isCompleted
      );
      setOrders(packingOrders);

      // Fetch produced counts
      const producedCounts: Record<string, number> = {};
      for (const order of packingOrders) {
        try {
          const response = await fetch(`/api/marketing-orders/total-produced?orderId=${order.id}`);
          if (response.ok) {
            const data = await response.json();
            producedCounts[order.id] = data.totalProduced || 0;
          }
        } catch (e) {
          console.error(`Error fetching produced for ${order.id}:`, e);
        }
      }
      setTotalProducedMap(producedCounts);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    return (
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleProcessOrder = (order: MarketingOrder) => {
    setSelectedOrder(order);
    setIsProductionDialogOpen(true);
  };

  const handleHandover = async (order: MarketingOrder) => {
    try {
      const success = await handoverOrder(order.id, order.status);
      if (success) {
        toast({
          title: "Handover Success",
          description: `Order ${order.orderNumber} moved to the next stage.`,
        });
        fetchOrders();
      }
    } catch (error) {
      console.error('Handover error:', error);
      toast({ title: "Error", description: "Handover failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Packing & Finishing Control
          </h1>
          <p className="text-muted-foreground">Manage final production stages and dispatch preparation.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search orders..."
              className="pl-8 bg-white border-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={fetchOrders} variant="outline" className="shadow-sm">
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase">In Finishing</p>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'Finishing').length}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase">In Packing</p>
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'Packing').length}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase">Daily Output</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase">Due This Week</p>
              <Clock className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle>My Department Tasks</CardTitle>
          <CardDescription>Orders currently assigned to your department or awaiting handover.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-100/50">
                <TableRow>
                  <TableHead className="w-[80px]">Product</TableHead>
                  <TableHead>Order Info</TableHead>
                  <TableHead>QC Status</TableHead>
                  <TableHead>Execution Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Planned Dates</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                         <span>Loading production tasks...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const produced = totalProducedMap[order.id] || 0;
                    const progress = Math.min(100, Math.round((produced / order.quantity) * 100));

                    return (
                      <TableRow key={order.id} className="hover:bg-primary/5 transition-colors group">
                        <TableCell>
                          {order.imageUrl ? (
                            <Image 
                              src={order.imageUrl} 
                              alt={order.productName} 
                              width={60} 
                              height={60} 
                              className="rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-[60px] h-[60px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                               <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-bold text-base">{order.orderNumber}</div>
                            <div className="text-xs font-medium text-muted-foreground">{order.productName}</div>
                            <div className="text-[10px] text-primary/70 font-mono">{order.productCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold uppercase",
                            (order.qualityInspectionStatus === 'Passed' || order.qualityInspectionStatus === 'Approved') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            (order.qualityInspectionStatus === 'Failed' || order.qualityInspectionStatus === 'Rejected') ? "bg-red-50 text-red-700 border-red-200" :
                            order.qualityInspectionStatus === 'Rework' ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-gray-50 text-gray-500 border-gray-200"
                          )}>
                             {order.qualityInspectionStatus || 'No Report'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <div className="w-32 space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold">
                                 <span>{produced} / {order.quantity}</span>
                                 <span>{progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                 <div 
                                   className={cn(
                                     "h-full transition-all duration-500",
                                     progress < 50 ? "bg-orange-400" : "bg-green-500"
                                   )}
                                   style={{ width: `${progress}%` }}
                                 />
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "capitalize shadow-sm py-1 px-2 text-[11px]",
                            order.status === 'Finishing' && "border-orange-200 bg-orange-50 text-orange-700",
                            order.status === 'Quality Inspection' && "border-indigo-200 bg-indigo-50 text-indigo-700",
                            order.status === 'Packing' && "border-blue-200 bg-blue-50 text-blue-700"
                          )}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-[11px] gap-1">
                             <div className="flex items-center text-green-700 font-medium">
                                <Clock className="mr-1 h-3 w-3" /> Start: {order.packingStartDate || '--'}
                             </div>
                             <div className="flex items-center text-red-700 font-medium">
                                <CheckCircle className="mr-1 h-3 w-3" /> End: {order.packingFinishDate || '--'}
                             </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1.5 items-end">
                            <Button 
                              size="sm" 
                              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-md"
                              onClick={() => handleProcessOrder(order)}
                            >
                              Process Output
                            </Button>
                            {(order.status === 'Packing' || produced >= order.quantity * 0.9) && (
                               <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-7 text-[10px] border-primary/20 hover:bg-primary/5"
                                  onClick={() => handleHandover(order)}
                                >
                                  Handover <ArrowRight className="ml-1 h-3 w-3" />
                               </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                       <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                       No active orders assigned to the Packing/Finishing department.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center pt-2 opacity-70 hover:opacity-100 transition-opacity">
        <Button variant="ghost" onClick={() => router.push('/profile')} className="text-muted-foreground">
           <User className="mr-2 h-4 w-4" /> My Profile
        </Button>
        <Button variant="ghost" onClick={() => router.push('/production-dashboard')} className="text-muted-foreground">
           <LayoutDashboard className="mr-2 h-4 w-4" /> Production Dashboard
        </Button>
      </div>

      {/* Production Update Dialog */}
      <Dialog open={isProductionDialogOpen} onOpenChange={setIsProductionDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b p-6 flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Register Production Output</DialogTitle>
              <p className="text-sm text-muted-foreground">Update packing/finishing counts for Order {selectedOrder?.orderNumber}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsProductionDialogOpen(false)}>
               <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-6">
            {selectedOrder && (
              <DailyProductionForm 
                orderId={selectedOrder.id}
                items={selectedOrder.items}
                totalQuantity={selectedOrder.quantity}
                orderStatus={selectedOrder.status}
                userRole={user.role}
                piecesPerSet={selectedOrder.piecesPerSet}
                onStatusUpdate={() => {
                  fetchOrders();
                }}
              />
            )}
          </div>
          <DialogFooter className="p-6 pt-0">
             <Button variant="outline" onClick={() => setIsProductionDialogOpen(false)} className="w-full">
               Close Update Panel
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}