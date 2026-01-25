import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MarketingOrder, MarketingOrderStatus } from "@/lib/marketing-orders";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Edit, 
  Trash2, 
  X, 
  CheckCircle, 
  Scissors, 
  Factory, 
  Package, 
  Truck,
  Calendar,
  Flag,
  ClipboardList,
  FlaskConical,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import Image from "next/image";
import { DailyProductionForm } from "@/components/daily-production-form";
import { DailyProductionChart } from "@/components/daily-production-chart";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

interface MarketingOrderDetailDialogProps {
  order: MarketingOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (order: MarketingOrder) => void;
  onDelete: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onUpdateStatus: (orderId: string, status: MarketingOrderStatus) => void;
  onExportToPdf: (orderId: string) => void;
}

export function MarketingOrderDetailDialog({ 
  order, 
  open, 
  onOpenChange,
  onEdit,
  onDelete,
  onCancel,
  onUpdateStatus,
  onExportToPdf
}: MarketingOrderDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'progress' | 'production'>('details');
  const [totalProduced, setTotalProduced] = useState<number>(0);
  
  const userRole = user?.role;
  const isFactory = userRole === 'factory';
  const canEdit = isFactory || userRole === 'marketing';
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning':
        return 'bg-blue-100 text-blue-800';
      case 'Sample Making':
        return 'bg-pink-100 text-pink-800';
      case 'Cutting':
        return 'bg-yellow-100 text-yellow-800';
      case 'Sewing':
        return 'bg-purple-100 text-purple-800';
      case 'Finishing':
        return 'bg-teal-100 text-teal-800';
      case 'Quality Inspection':
        return 'bg-indigo-100 text-indigo-800';
      case 'Packing':
        return 'bg-gray-100 text-gray-800';
      case 'Delivery':
        return 'bg-orange-100 text-orange-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Update state if role changes or if order is completed
  useEffect(() => {
    if (activeTab === 'production' && !isFactory) {
      setActiveTab('details');
    }
  }, [isFactory]);

  // Fetch total produced quantity
  useEffect(() => {
    const fetchTotalProduced = async () => {
      try {
        const response = await fetch(`/api/marketing-orders/total-produced?orderId=${order.id}`);
        if (response.ok) {
          const data = await response.json();
          setTotalProduced(data.totalProduced || 0);
        }
      } catch (error) {
        console.error('Error fetching total produced quantity:', error);
      }
    };
    
    if (order.id && open) {
      fetchTotalProduced();
    }
  }, [order.id, open]);

  const handleStatusUpdate = () => {
    // Refresh the order data when status is updated
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };
  
  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };
  
  const handleCompleteOrder = async () => {
    // Check if all production stages are completed
    const requiredStages = ['Placed Order', 'Planning', 'Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection', 'Packing', 'Delivery'];
    const completedStages = [
      'Placed Order',
      order.planningCompletionDate ? 'Planning' : null,
      order.sampleCompletionDate ? 'Sample Making' : null,
      order.cuttingCompletionDate ? 'Cutting' : null,
      order.sewingCompletionDate ? 'Sewing' : null,
      order.finishingCompletionDate ? 'Finishing' : null,
      order.qualityInspectionCompletionDate ? 'Quality Inspection' : null,
      order.packingCompletionDate ? 'Packing' : null,
      order.deliveryCompletionDate ? 'Delivery' : null,
    ].filter(Boolean);
    
    const allStagesCompleted = requiredStages.every(stage => completedStages.includes(stage));
    
    if (!allStagesCompleted) {
      toast({
        title: "Cannot Complete Order",
        description: "All production stages (Planning, Sample Making, Cutting, Sewing, Finishing, Quality, Packing, Delivery) must be completed before marking the order as finished.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if all quantities have been produced
    const remaining = order.quantity - totalProduced;
    
    if (remaining > 0) {
      toast({
        title: "Cannot Complete Order",
        description: `Cannot mark order as completed. There are still ${remaining} units remaining to be produced.`,
        variant: "destructive",
      });
      return;
    }
    
    // Proceed with completing the order
    onUpdateStatus(order.id, 'Completed' as MarketingOrderStatus);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marketing Order Details - {order.orderNumber}</DialogTitle>
            <DialogDescription>
              View and update the details of marketing order {order.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('details')}
            >
              Order Details
            </button>
            {isFactory && (
              <button
                className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'production' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                onClick={() => setActiveTab('production')}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Production Entry
              </button>
            )}
            <button
              className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'progress' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('progress')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Production Progress
            </button>
          </div>
          
          <div className="py-4">
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-6">
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-lg mb-2">Order Items Matrix</h3>
                  <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="px-4 py-2 text-left font-black text-slate-500 uppercase text-[10px] w-32">Color \ Size</th>
                          {[...new Set(order.items.map(i => i.size))].sort().map(size => (
                            <th key={size} className="px-4 py-2 text-center font-black text-slate-800 uppercase text-xs border-l">{size}</th>
                          ))}
                          <th className="px-4 py-2 text-center font-black text-primary uppercase text-xs border-l bg-primary/5">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...new Set(order.items.map(i => i.color))].sort().map(color => (
                          <tr key={color} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2 font-bold text-slate-700 flex items-center gap-2">
                               <div className="h-3 w-3 rounded-full border shadow-sm" style={{ backgroundColor: color.toLowerCase() }}></div>
                               {color}
                            </td>
                            {[...new Set(order.items.map(i => i.size))].sort().map(size => {
                              const item = order.items.find(i => i.color === color && i.size === size);
                              return (
                                <td key={size} className="px-4 py-2 text-center font-mono font-bold text-slate-600 border-l">
                                  {item ? item.quantity.toLocaleString() : "-"}
                                </td>
                              );
                            })}
                            <td className="px-4 py-2 text-center font-black text-primary bg-primary/5 border-l">
                              {order.items
                                .filter(i => i.color === color)
                                .reduce((sum, i) => sum + i.quantity, 0)
                                .toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-900 text-white font-bold">
                        <tr>
                          <td className="px-4 py-2 text-[9px] uppercase tracking-widest text-slate-400">GRAND TOTAL</td>
                          {[...new Set(order.items.map(i => i.size))].sort().map(size => (
                            <td key={size} className="px-4 py-2 text-center border-l border-slate-700">
                               {order.items
                                .filter(i => i.size === size)
                                .reduce((sum, i) => sum + i.quantity, 0)
                                .toLocaleString()}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-center text-primary bg-primary/20 border-l border-slate-700">
                             {order.quantity.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                
                <div className="md:col-span-1">
                  {order.imageUrl && (
                    <div className="relative h-48 w-full rounded-md overflow-hidden border mb-4">
                      <Image 
                        src={order.imageUrl} 
                        alt={order.productName} 
                        fill 
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }} 
                      />
                    </div>
                  )}
                  <h3 className="font-semibold text-lg mb-2">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product:</span>
                      <span className="font-medium">{order.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Code:</span>
                      <span>{order.productCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Quantity:</span>
                      <span>{order.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produced:</span>
                      <span>{totalProduced}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span>{order.quantity - totalProduced}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 gap-2 text-xs">
                       <div className="flex justify-between">
                          <span className="text-muted-foreground">Placed:</span>
                          <span>{order.orderPlacementDate ? new Date(order.orderPlacementDate).toLocaleDateString() : '-'}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-muted-foreground">Deadline:</span>
                          <span className="font-bold text-red-600">{order.plannedDeliveryDate ? new Date(order.plannedDeliveryDate).toLocaleDateString() : '-'}</span>
                       </div>
                    </div>
                    {order.description && (
                      <div className="mt-4 pt-4 border-t">
                        <span className="text-xs font-bold text-slate-400 uppercase">Notes:</span>
                        <p className="text-xs mt-1 text-slate-600 leading-relaxed italic">"{order.description}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'production' && isFactory && (
              <div className="space-y-6 pr-6">
                {!order.isCompleted && order.status !== ('Cancelled' as MarketingOrderStatus) ? (
                  <>
                    <DailyProductionForm 
                      orderId={order.id} 
                      items={order.items} 
                      totalQuantity={order.quantity}
                      onStatusUpdate={handleStatusUpdate} 
                      orderStatus={order.status}
                      userRole={userRole}
                    />
                    {!order.isPlanningApproved && userRole !== 'planning' && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-3 text-amber-800 text-sm">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                        <p>Planning "Go-ahead" is pending. Full system access for this order is restricted until approved by Planning.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center border-2 border-dashed rounded-xl">
                     <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                     <h3 className="text-lg font-bold">Process Completed</h3>
                     <p className="text-muted-foreground">This order is already completed/cancelled. No further production entries allowed.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="pr-6">
                <DailyProductionChart orderId={order.id} totalQuantity={order.quantity} />
              </div>
            )}
          </div>
          {/* Status Progress */}
          <div className="mt-6 pr-6">
            <h3 className="font-semibold text-lg mb-2">Production Progress</h3>
            <div className="flex items-center justify-between">
              {['Placed Order', 'Planning', 'Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection', 'Packing', 'Delivery', 'Completed'].map((status, index) => {
                const statusList = ['Placed Order', 'Planning', 'Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection', 'Packing', 'Delivery', 'Completed'];
                const currentStatusIndex = statusList.indexOf(order.status as string);
                const stepIndex = statusList.indexOf(status);
                const isCompleted = stepIndex <= currentStatusIndex;

                return (
                  <div key={status} className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                      isCompleted ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-[10px] mt-1 text-center whitespace-nowrap">{status}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Actions */}
          <div className="mt-6 pr-6 flex flex-wrap gap-2">
            {canEdit && (
              <Button onClick={() => onEdit(order)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => onExportToPdf(order.id)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Download Report
            </Button>
            {!order.isCompleted && order.status !== ('Cancelled' as MarketingOrderStatus) && userRole === 'factory' && (
              <>
                <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Cutting' as MarketingOrderStatus)}>
                  <Scissors className="mr-2 h-4 w-4" />
                  Cutting
                </Button>
                <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Production' as MarketingOrderStatus)}>
                  <Factory className="mr-2 h-4 w-4" />
                  Production
                </Button>
                <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Packing' as MarketingOrderStatus)}>
                  <Package className="mr-2 h-4 w-4" />
                  Packing
                </Button>
                <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Delivery' as MarketingOrderStatus)}>
                  <Truck className="mr-2 h-4 w-4" />
                  Delivery
                </Button>
                <Button onClick={handleCompleteOrder}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </Button>
              </>
            )}
            {!order.isCompleted && order.status !== ('Cancelled' as MarketingOrderStatus) && canEdit && (
              <Button variant="destructive" onClick={() => onCancel(order.id)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            {canEdit && (
              <Button variant="destructive" onClick={openDeleteDialog}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the marketing order
              and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete(order.id);
                closeDeleteDialog();
                onOpenChange(false);
              }} 
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
