import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
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
  Truck 
} from "lucide-react";
import Image from "next/image";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marketing Order Details - {order.orderNumber}</DialogTitle>
        </DialogHeader>
        
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
            </div>
          </div>
        </div>
        
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
              <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Cutting')}>
                <Scissors className="mr-2 h-4 w-4" />
                Cutting
              </Button>
              <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Production')}>
                <Factory className="mr-2 h-4 w-4" />
                Production
              </Button>
              <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Packing')}>
                <Package className="mr-2 h-4 w-4" />
                Packing
              </Button>
              <Button variant="outline" onClick={() => onUpdateStatus(order.id, 'Delivery')}>
                <Truck className="mr-2 h-4 w-4" />
                Delivery
              </Button>
              <Button onClick={() => onUpdateStatus(order.id, 'Completed')}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete
              </Button>
              <Button variant="destructive" onClick={() => onCancel(order.id)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          <Button variant="destructive" onClick={() => onDelete(order.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}