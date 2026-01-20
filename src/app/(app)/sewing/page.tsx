"use client";

import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMarketingOrders, updateMarketingOrder, MarketingOrder, getOperationBulletin, OperationBulletinItem, handoverOrder } from '@/lib/marketing-orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Scissors, 
  Factory, 
  Package, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  User,
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { format } from 'date-fns';
import { DailyProductionForm } from '@/components/daily-production-form';

export default function SewingDashboardPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [obItems, setObItems] = useState<OperationBulletinItem[]>([]);
  const [isOBDialogOpen, setIsOBDialogOpen] = useState(false);
  const [isProductionDialogOpen, setIsProductionDialogOpen] = useState(false);
  const [totalProducedMap, setTotalProducedMap] = useState<Record<string, number>>({});

  // Check if user has sewing role, otherwise redirect
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'sewing')) {
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
      // Filter to show only orders in 'Cutting', 'Sewing', 'Finishing' statuses
      // We also want to see 'Cutting' orders that are HANDED OVER to sewing
      const sewingOrders = fetchedOrders.filter(order => 
        ['Cutting', 'Sewing', 'Finishing', 'Quality Inspection', 'Packing'].includes(order.status) &&
        !order.isCompleted
      );
      setOrders(sewingOrders);
      
      // Fetch total produced for each order
      const producedCounts: Record<string, number> = {};
      for (const order of sewingOrders) {
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
        description: "Failed to load orders data.",
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

  const handleAcceptCutPanels = async (orderId: string) => {
    try {
      // Update order status to Sewing
      const success = await updateMarketingOrder(orderId, {
        status: 'Sewing',
        sewingStartDate: new Date().toISOString().split('T')[0],
        sewingStatus: 'in_progress'
      });
      
      if (success) {
        toast({
          title: "Order Accepted",
          description: "Cut panels accepted. Production has officially started in Sewing.",
        });
        fetchOrders();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error: any) {
      console.error('Error accepting cut panels:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept panels.",
        variant: "destructive",
      });
    }
  };

  const handleHandoverToPacking = async (order: MarketingOrder) => {
    try {
      const success = await handoverOrder(order.id, order.status);
      
      if (success) {
        toast({
          title: "Handover Success",
          description: `Order ${order.orderNumber} handed over to the next stage.`,
        });
        fetchOrders();
      }
    } catch (error) {
      console.error('Error handing over:', error);
      toast({ title: "Error", description: "Handover failed", variant: "destructive" });
    }
  };

  const handleViewOB = async (order: MarketingOrder) => {
    try {
      setSelectedOrder(order);
      const items = await getOperationBulletin(order.id, order.productCode);
      setObItems(items);
      setIsOBDialogOpen(true);
    } catch (error) {
      console.error('Error fetching OB:', error);
      toast({ title: "Error", description: "Failed to load Operation Breakdown", variant: "destructive" });
    }
  };

  const handleOpenProductionForm = (order: MarketingOrder) => {
    setSelectedOrder(order);
    setIsProductionDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'sewing') return null;

  return (
    <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Sewing Department Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor and update daily sewing production progress.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search orders..."
              className="pl-8 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={fetchOrders} variant="outline" className="shrink-0 shadow-sm">
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-blue-600">Pending Acceptance</p>
              <Scissors className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'Cutting').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders from Cutting</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-purple-600">Active Sewing</p>
              <Factory className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold">{orders.filter(o => o.status === 'Sewing').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently on floor</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-green-600">Production Rate</p>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold">88%</div>
            <p className="text-xs text-muted-foreground mt-1">Average efficiency</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-orange-600">Delayed Plan</p>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">Behind schedule</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tasks Table */}
      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between bg-white/50 rounded-t-xl border-b pb-4">
          <div>
            <CardTitle className="text-xl">Production Workflow</CardTitle>
            <CardDescription>Track orders from cutting handover to sewing completion.</CardDescription>
          </div>
          <div className="hidden md:block">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
              Production Mode Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md">
            <Table>
              <TableHeader className="bg-gray-50/80">
                <TableRow>
                  <TableHead className="w-[100px]">Product</TableHead>
                  <TableHead>Order Info</TableHead>
                  <TableHead>Execution Plan</TableHead>
                  <TableHead>QC Status</TableHead>
                  <TableHead>Output Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Operations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="text-muted-foreground">Fetching production data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => {
                    const produced = totalProducedMap[order.id] || 0;
                    const pending = order.quantity - produced;
                    const progressPercentage = Math.round((produced / order.quantity) * 100);

                    return (
                      <TableRow key={order.id} className="hover:bg-primary/5 transition-colors group">
                        <TableCell>
                          {order.imageUrl ? (
                            <Image 
                              src={order.imageUrl} 
                              alt={order.productName} 
                              width={80} 
                              height={80} 
                              className="rounded-lg object-cover border shadow-sm group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              <Package className="h-8 w-8" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-bold text-lg">{order.orderNumber}</div>
                            <div className="text-xs font-mono text-muted-foreground bg-gray-100 w-fit px-1.5 rounded">{order.productCode}</div>
                            <div className="text-sm font-medium">{order.productName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center text-blue-600">
                              <Clock className="mr-1.5 h-3.5 w-3.5" />
                              <span className="font-medium">Plan Start:</span>
                              <span className="ml-1">{order.sewingStartDate || 'TBD'}</span>
                            </div>
                            <div className="flex items-center text-orange-600">
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              <span className="font-medium">Plan End:</span>
                              <span className="ml-1">{order.sewingFinishDate || 'TBD'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground pt-1 italic">
                              Initial Date: {order.orderPlacementDate ? format(new Date(order.orderPlacementDate), 'dd MMM') : '--'}
                            </div>
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
                          <div className="w-48 space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                              <span>Progress</span>
                              <span>{progressPercentage}%</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-500",
                                  progressPercentage < 30 ? "bg-red-500" : 
                                  progressPercentage < 70 ? "bg-yellow-500" : "bg-green-500"
                                )}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-2 text-[10px] mt-1">
                              <div><span className="text-muted-foreground font-normal">Sewn:</span> <span className="font-bold">{produced}</span></div>
                              <div className="text-right text-red-600"><span className="text-muted-foreground font-normal">Pending:</span> <span className="font-bold">{pending}</span></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "capitalize shadow-sm py-1 px-3",
                            order.status === 'Cutting' && "border-yellow-200 bg-yellow-50 text-yellow-700",
                            order.status === 'Sewing' && "border-blue-200 bg-blue-50 text-blue-700",
                            order.status === 'Finishing' && "border-purple-200 bg-purple-50 text-purple-700",
                            order.status === 'Quality Inspection' && "border-indigo-200 bg-indigo-50 text-indigo-700"
                          )}>
                            {order.status}
                          </Badge>
                          {order.cuttingStatus === 'handed_over' && order.status === 'Cutting' && (
                            <div className="text-[10px] text-blue-600 font-medium mt-1 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" /> Ready for Acceptance
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex gap-2">
                              <Button 
                                 size="sm"
                                 variant="outline"
                                 className="h-8 text-xs bg-white"
                                 onClick={() => handleViewOB(order)}
                              >
                                 OB Breakdown
                              </Button>
                              
                              {order.status === 'Cutting' ? (
                                <Button 
                                  size="sm" 
                                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 shadow-sm"
                                  onClick={() => handleAcceptCutPanels(order.id)}
                                >
                                  Accept Panels
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  className="h-8 text-xs bg-green-600 hover:bg-green-700 shadow-sm"
                                  onClick={() => handleOpenProductionForm(order)}
                                >
                                  Update Daily Status
                                </Button>
                              )}
                            </div>
                            
                            {order.status === 'Sewing' && produced >= order.quantity * 0.5 && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="h-8 text-xs w-full max-w-[150px]"
                                onClick={() => handleHandoverToPacking(order)}
                              >
                                Handover to Packing <ArrowRight className="ml-1 h-3 w-3" />
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
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-10 w-10 text-gray-200" />
                        <p>No active sewing orders found matching your search.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4 opacity-70 hover:opacity-100 transition-opacity">
        <Button variant="ghost" onClick={() => router.push('/profile')} className="text-muted-foreground">
           <User className="mr-2 h-4 w-4" /> My Profile
        </Button>
        <Button variant="ghost" onClick={() => router.push('/production-dashboard')} className="text-muted-foreground">
           <LayoutDashboard className="mr-2 h-4 w-4" /> Production Dashboard
        </Button>
      </div>

      {/* Operation Breakdown Dialog */}
      <Dialog open={isOBDialogOpen} onOpenChange={setIsOBDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-gradient-to-r from-primary/10 to-transparent">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Operation Breakdown - {selectedOrder?.productCode}
            </DialogTitle>
            <CardDescription>{selectedOrder?.productName} | Total Qty: {selectedOrder?.quantity}</CardDescription>
          </DialogHeader>
          <div className="overflow-y-auto p-6 pt-0">
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0">
                <TableRow>
                  <TableHead className="w-16">Seq</TableHead>
                  <TableHead>Operation Name</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead className="text-right">SMV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obItems.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-medium">{item.sequence}</TableCell>
                    <TableCell className="font-medium">{item.operationName}</TableCell>
                    <TableCell>
                       <Badge variant="secondary" className="font-normal">{item.machineType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">{item.smv}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-4 border-t bg-gray-50/50">
             <Button onClick={() => setIsOBDialogOpen(false)}>Close Breakdown View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Production Status Dialog */}
      <Dialog open={isProductionDialogOpen} onOpenChange={setIsProductionDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b p-6 flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Daily Production Updates</DialogTitle>
              <p className="text-sm text-muted-foreground">Record output for Order {selectedOrder?.orderNumber} ({selectedOrder?.productCode})</p>
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
                userRole="sewing"
                piecesPerSet={selectedOrder.piecesPerSet}
                onStatusUpdate={() => {
                  fetchOrders();
                  // Don't close immediately if they want to enter more
                }}
              />
            )}
          </div>
          <DialogFooter className="p-6 pt-0">
             <Button variant="outline" onClick={() => setIsProductionDialogOpen(false)} className="w-full">
               Finished Updating Status
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Additional icons needed
function ClipboardList(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  )
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}