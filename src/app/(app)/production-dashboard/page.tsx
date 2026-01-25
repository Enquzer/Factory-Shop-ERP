"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getMarketingOrders, MarketingOrder, MarketingOrderStatus } from "@/lib/marketing-orders";
import { MarketingOrderDetailDialog } from "@/components/marketing-order-detail-dialog";
import { 
  ClipboardList, 
  Scissors, 
  Factory, 
  CheckCircle, 
  Package, 
  FlaskConical, 
  Search,
  CheckCheck, 
  TrendingUp,
  Clock,
  AlertTriangle,
  MoveUp,
  MoveDown,
  GanttChart,
  ChevronRight,
  Image as ImageIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ProductionDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<any>(null);

  const role = user?.role || "factory";

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, []);

  const fetchOrders = async () => {
    try {
      const fetchedOrders = await getMarketingOrders();
      setOrders(fetchedOrders);
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

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/production-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Filter orders based on role and search term
  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Role-based status filter - Expanded to show pipeline
    if (role === 'factory') return true; 
    
    switch (role) {
      case 'planning':
        return true; // Planning sees everything
      case 'sample_maker':
        return ['Planning', 'Sample Making', 'Cutting', 'Sewing'].includes(order.status) && !order.isCompleted;
      case 'cutting':
        return ['Planning', 'Sample Making', 'Cutting', 'Sewing'].includes(order.status) && !order.isCompleted;
      case 'sewing':
        return ['Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection'].includes(order.status) && !order.isCompleted;
      case 'finishing':
      case 'quality_inspection':
      case 'packing':
        return ['Sewing', 'Finishing', 'Quality Inspection', 'Packing', 'Delivery'].includes(order.status) && !order.isCompleted;
      default:
        return true;
    }
  });

  const getRoleTitle = () => {
    switch (role) {
      case 'planning': return 'Planning Dashboard';
      case 'sample_maker': return 'Sample Room Dashboard';
      case 'cutting': return 'Cutting Room Dashboard';
      case 'sewing': return 'Sewing Floor Dashboard';
      case 'finishing': return 'Finishing Section Dashboard';
      case 'quality_inspection': return 'Quality Control Dashboard';
      case 'packing': return 'Packing & Dispatch Dashboard';
      default: return 'Production Dashboard';
    }
  };

  const getRoleKPIs = () => {
    const active = filteredOrders.length;
    
    // Get real values from stats
    const stageName = role.charAt(0).toUpperCase() + role.slice(1);
    const correctedStageName = stageName === 'Sample_maker' ? 'Sample Making' : 
                               stageName === 'Quality_inspection' ? 'Quality Inspection' : stageName;

    const outputToday = stats?.outputToday?.find((s: any) => s.stage === correctedStageName)?.count || 0;
    const wipUnits = stats?.wipPerStage?.find((s: any) => s.stage === correctedStageName)?.count || 0;

    switch (role) {
      case 'planning':
        return [
          { label: 'Orders to Plan', value: active, icon: ClipboardList, color: 'text-blue-600' },
          { label: 'Weekly Capacity', value: '10,000', icon: TrendingUp, color: 'text-green-600' },
          { label: 'Planning WIP', value: wipUnits, icon: Clock, color: 'text-orange-500' }
        ];
      case 'sewing':
        return [
          { label: 'Orders in Flow', value: active, icon: Factory, color: 'text-purple-600' },
          { label: 'Active WIP (Units)', value: wipUnits, icon: Clock, color: 'text-orange-500' },
          { label: 'Output Today', value: outputToday, icon: TrendingUp, color: 'text-green-600' }
        ];
      case 'cutting':
        return [
          { label: 'Orders in Pipeline', value: active, icon: Scissors, color: 'text-yellow-600' },
          { label: 'Cut Today (Units)', value: outputToday, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Target Achievement', value: '92%', icon: TrendingUp, color: 'text-blue-600' }
        ];
      default:
        return [
          { label: 'Active Tasks', value: active, icon: ClipboardList, color: 'text-blue-600' },
          { label: 'Daily Output', value: outputToday, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Floor WIP', value: wipUnits, icon: Clock, color: 'text-orange-500' }
        ];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{getRoleTitle()}</h1>
          <p className="text-muted-foreground italic">Comprehensive view of production flow and department handovers.</p>
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
          <Button onClick={() => { fetchOrders(); fetchStats(); }} variant="outline" className="shadow-sm">
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh Stats
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {getRoleKPIs().map((kpi, i) => (
          <Card key={i} className="overflow-hidden border-none shadow-md bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                  <h3 className="text-3xl font-extrabold mt-1">{kpi.value.toLocaleString()}</h3>
                </div>
                <div className={`p-4 rounded-xl bg-gray-50 shadow-inner ${kpi.color}`}>
                  <kpi.icon className="h-7 w-7" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-xl">Production Flow & Pipeline</CardTitle>
            <CardDescription>Visualizing orders moving through your department's stages.</CardDescription>
          </div>
          <div className="flex gap-2">
             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Incoming</Badge>
             <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Active</Badge>
             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Handover</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-100/50">
                <TableRow>
                  <TableHead className="w-[100px]">Product</TableHead>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Output Progress</TableHead>
                  <TableHead>QC Status (Current Stage)</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.sort((a,b) => (b.priority || 0) - (a.priority || 0)).map((order) => {
                    const produced = stats?.totalProduced?.find((p: any) => p.orderId === order.id)?.total || 0;
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
                              className="rounded-md object-cover border shadow-sm group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-[60px] h-[60px] bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                               <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-bold text-base flex items-center gap-2">
                               {order.orderNumber}
                               {order.priority && order.priority > 5 && (
                                 <Badge className="bg-red-100 text-red-700 border-none px-1 h-3.5 text-[8px] uppercase">Urgent</Badge>
                               )}
                            </div>
                            <div className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">{order.productName}</div>
                            <div className="text-[10px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded w-fit font-mono">{order.productCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="w-32 space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold">
                                 <span>{produced} / {order.quantity}</span>
                                 <span>{progress}%</span>
                              </div>
                              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                 <div 
                                   className={cn(
                                     "h-full transition-all duration-500",
                                     progress < 30 ? "bg-orange-500" : progress < 70 ? "bg-blue-500" : "bg-green-500"
                                   )}
                                   style={{ width: `${progress}%` }}
                                 />
                              </div>
                           </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const status = order.qualityInspectionStatus;
                            const stage = order.qualityInspectionStage;
                            const currentStatus = order.status;

                            // Map order status to expected inspection stage
                            let expectedStage = '';
                            if (currentStatus === 'Sample Making') expectedStage = 'Sample';
                            else if (currentStatus === 'Cutting') expectedStage = 'Inline-Cutting';
                            else if (currentStatus === 'Sewing') expectedStage = 'Inline-Sewing';
                            else if (['Finishing', 'Quality Inspection', 'Packing'].includes(currentStatus)) expectedStage = 'Final';

                            const isMismatch = status && status !== 'Pending' && stage !== expectedStage;
                            const displayStatus = isMismatch ? 'Pending' : (status || 'No Report');
                            const displayStage = isMismatch ? expectedStage : (stage || '');

                            return (
                              <Badge variant="outline" className={cn(
                                "text-[10px] font-bold uppercase",
                                (displayStatus === 'Passed' || displayStatus === 'Approved') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                (displayStatus === 'Failed' || displayStatus === 'Rejected') ? "bg-red-50 text-red-700 border-red-200" :
                                (displayStatus === 'Rework' || displayStatus === 'Pending') ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-gray-50 text-gray-500 border-gray-200"
                              )}>
                                {displayStage && <span className="mr-1 opacity-70">[{displayStage}]</span>}
                                {displayStatus}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className={cn(
                              "capitalize shadow-sm py-1 px-2 text-[11px] font-bold border-2",
                              order.status === 'Cutting' && "border-yellow-200 bg-yellow-50 text-yellow-700",
                              order.status === 'Sewing' && "border-purple-200 bg-purple-50 text-purple-700",
                              order.status === 'Finishing' && "border-blue-200 bg-blue-50 text-blue-700",
                              order.status === 'Planning' && "border-gray-200 bg-gray-50 text-gray-700"
                           )}>
                              {order.status}
                           </Badge>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col text-xs space-y-1">
                              {(() => {
                                const status = order.status;
                                let start = order.productionStartDate;
                                let end = order.plannedDeliveryDate || order.dueDate;
                                let label = 'Production';

                                if (status === 'Cutting') {
                                  start = order.cuttingStartDate;
                                  end = order.cuttingFinishDate;
                                  label = 'Cutting';
                                } else if (status === 'Sewing') {
                                  start = order.sewingStartDate;
                                  end = order.sewingFinishDate;
                                  label = 'Sewing';
                                } else if (status === 'Packing' || status === 'Finishing') {
                                  // Finishing dates might be missing in type, falling back or using packing if available
                                  start = order.packingStartDate; 
                                  end = order.packingFinishDate;
                                  label = status === 'Finishing' ? 'Finish/Pack' : 'Packing';
                                }

                                // Fallback if stage specific dates are missing
                                if (!start && !end) {
                                   start = order.productionStartDate;
                                   end = order.plannedDeliveryDate || order.dueDate;
                                   label = 'Overall';
                                }

                                return (
                                  <>
                                    <div className="flex items-center text-muted-foreground font-medium" title={`${label} Timeline`}>
                                       <Clock className="mr-1 h-3 w-3 text-primary/70" />
                                       <span className="truncate max-w-[100px]">
                                          {start ? new Date(start).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'} 
                                          {' - '} 
                                          {end ? new Date(end).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'}
                                       </span>
                                    </div>
                                    {order.priority && (
                                      <div className="text-[10px] text-primary font-bold bg-primary/5 px-1 rounded w-fit">
                                        Priority: {order.priority}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {role === 'sewing' && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 text-[10px] flex items-center gap-1 text-primary hover:bg-primary/10"
                                onClick={() => router.push('/sewing')}
                              >
                                Go to Floor <ChevronRight className="h-3 w-3" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-[10px] border-primary/20 hover:bg-primary/5 shadow-sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailDialogOpen(true);
                              }}
                            >
                              Details
                            </Button>
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
                          <p>No orders in pipeline for your department.</p>
                          <Button variant="link" onClick={fetchOrders} className="text-xs text-primary">Check full factory flow</Button>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedOrder && (
        <MarketingOrderDetailDialog
          order={selectedOrder}
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          onEdit={() => {}}
          onDelete={() => {}}
          onCancel={() => {}}
          onUpdateStatus={async (id, status) => {
            const token = localStorage.getItem('authToken');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/marketing-orders/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });
            if (res.ok) {
              fetchOrders();
              fetchStats();
            }
          }}
          onExportToPdf={() => {}}
        />
      )}
    </div>
  );
}
