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
  BarChart3
} from "lucide-react";
import Image from "next/image";
import { DailyProductionForm } from "@/components/daily-production-form";
import { DailyProductionChart } from "@/components/daily-production-chart";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'progress'>('details');
  const [totalProduced, setTotalProduced] = useState<number>(0);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Placed Order':
        return 'bg-blue-100 text-blue-800';
      case 'Cutting':
        return 'bg-yellow-100 text-yellow-800';
      case 'Production':
        return 'bg-purple-100 text-purple-800';
      case 'Packing':
        return 'bg-indigo-100 text-indigo-800';
      case 'Delivery':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
    const requiredStages = ['Placed Order', 'Cutting', 'Production', 'Packing', 'Delivery'];
    const completedStages = [
      'Placed Order',
      order.status === 'Cutting' ? 'Cutting' : null,
      order.status === 'Production' ? 'Production' : null,
      order.status === 'Packing' ? 'Packing' : null,
      order.status === 'Delivery' ? 'Delivery' : null,
    ].filter(Boolean);
    
    const allStagesCompleted = requiredStages.every(stage => completedStages.includes(stage));
    
    if (!allStagesCompleted) {
      toast({
        title: "Cannot Complete Order",
        description: "All production stages (Placed Order, Cutting, Production, Packing, Delivery) must be completed before marking the order as finished.",
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
            <button
              className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'progress' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('progress')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Production Progress
            </button>
          </div>
          
          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-6">
              <div className="md:col-span-2">
                <h3 className="font-semibold text-lg mb-2">Order Items</h3>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.color} {item.size}</h4>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm">Qty: {item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Daily Production Status Form */}
                {!order.isCompleted && order.status !== ('Cancelled' as MarketingOrderStatus) && (
                  <div className="mt-6">
                    <DailyProductionForm 
                      orderId={order.id} 
                      items={order.items} 
                      totalQuantity={order.quantity}
                      onStatusUpdate={handleStatusUpdate} 
                      orderStatus={order.status} // Pass order status
                    />
                  </div>
                )}
              </div>
              
              <div>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created By:</span>
                    <span>{order.createdBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created At:</span>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {/* New date fields */}
                  {order.orderPlacementDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        Placement Date:
                      </span>
                      <span>{new Date(order.orderPlacementDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {order.plannedDeliveryDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        Delivery Date:
                      </span>
                      <span>{new Date(order.plannedDeliveryDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {/* Sample status tracking fields */}
                  {order.sizeSetSampleApproved && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Flag className="mr-1 h-4 w-4" />
                        Sample Approved:
                      </span>
                      <span>{new Date(order.sizeSetSampleApproved).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {order.productionStartDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Factory className="mr-1 h-4 w-4" />
                        Production Start:
                      </span>
                      <span>{new Date(order.productionStartDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {order.productionFinishedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Production Finish:
                      </span>
                      <span>{new Date(order.productionFinishedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {/* Process completion dates */}
                  {order.cuttingCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Scissors className="mr-1 h-4 w-4" />
                        Cutting Completion:
                      </span>
                      <span>{new Date(order.cuttingCompletionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {order.productionCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Factory className="mr-1 h-4 w-4" />
                        Production Completion:
                      </span>
                      <span>{new Date(order.productionCompletionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {order.packingCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Package className="mr-1 h-4 w-4" />
                        Packing Completion:
                      </span>
                      <span>{new Date(order.packingCompletionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {order.deliveryCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <Truck className="mr-1 h-4 w-4" />
                        Delivery Completion:
                      </span>
                      <span>{new Date(order.deliveryCompletionDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {order.completedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed At:</span>
                      <span>{new Date(order.completedDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  {order.description && (
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <p className="mt-1">{order.description}</p>
                    </div>
                  )}
                  {order.isCompleted && (
                    <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">Inventory Update:</span> Factory inventory has been updated with the produced quantities. 
                        Product is now available for shop orders.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="pr-6">
              <DailyProductionChart orderId={order.id} totalQuantity={order.quantity} />
            </div>
          )}
          
          {/* Status Progress */}
          <div className="mt-6 pr-6">
            <h3 className="font-semibold text-lg mb-2">Production Progress</h3>
            <div className="flex items-center justify-between">
              {['Placed Order', 'Cutting', 'Production', 'Packing', 'Delivery', 'Completed'].map((status, index) => (
                <div key={status} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    order.status === status || 
                    (order.status === 'Cutting' && ['Placed Order'].includes(status)) ||
                    (order.status === 'Production' && ['Placed Order', 'Cutting'].includes(status)) ||
                    (order.status === 'Packing' && ['Placed Order', 'Cutting', 'Production'].includes(status)) ||
                    (order.status === 'Delivery' && ['Placed Order', 'Cutting', 'Production', 'Packing'].includes(status)) ||
                    (order.status === 'Completed' && ['Placed Order', 'Cutting', 'Production', 'Packing', 'Delivery'].includes(status))
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-xs mt-1 text-center">{status}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="mt-6 pr-6 flex flex-wrap gap-2">
            <Button onClick={() => onEdit(order)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => onExportToPdf(order.id)}>
              <FileText className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
            {!order.isCompleted && order.status !== ('Cancelled' as MarketingOrderStatus) && (
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
                <Button variant="destructive" onClick={() => onCancel(order.id)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
            <Button variant="destructive" onClick={openDeleteDialog}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
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
