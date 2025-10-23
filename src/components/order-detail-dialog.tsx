import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Order } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { OrderStatusFlow } from "@/components/order-status-flow";

interface OrderDetailDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - {order.id}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-6">
          <div className="md:col-span-2">
            <h3 className="font-semibold text-lg mb-2">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  {item.imageUrl ? (
                    <div className="relative w-16 h-16 rounded-md overflow-hidden">
                      <Image 
                        src={item.imageUrl} 
                        alt={item.name} 
                        fill 
                        style={{objectFit: 'cover'}} 
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-product.png';
                        }}
                        unoptimized={true}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">No Image</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.variant.color}, {item.variant.size}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm">Qty: {item.quantity}</span>
                      <span className="font-medium">ETB {(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shop:</span>
                <span className="font-medium">{order.shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{order.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={
                  order.status === 'Pending' ? 'default' :
                  order.status === 'Awaiting Payment' ? 'secondary' :
                  order.status === 'Paid' ? 'outline' :
                  order.status === 'Dispatched' ? 'outline' :
                  order.status === 'Delivered' ? 'secondary' : 'destructive'
                }>
                  {order.status}
                </Badge>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
        
        <OrderStatusFlow order={order} />
        
        {/* Payment Information */}
        {order.paymentSlipUrl && (
          <div className="mt-6 pr-6">
            <h3 className="font-semibold text-lg mb-2">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Payment Status</h4>
                <p className="text-muted-foreground">Payment Confirmed</p>
              </div>
              <div>
                <h4 className="font-medium">Payment Slip</h4>
                <div className="mt-2 border rounded-lg overflow-hidden max-w-xs">
                  <Image 
                    src={order.paymentSlipUrl || '/placeholder-payment.png'} 
                    alt="Payment slip" 
                    width={300} 
                    height={200} 
                    className="w-full h-auto object-contain"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-payment.png';
                    }}
                    unoptimized={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Dispatch Information */}
        {order.dispatchInfo && (
          <div className="mt-6 pr-6">
            <h3 className="font-semibold text-lg mb-2">Dispatch Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Shop Name</h4>
                <p className="text-muted-foreground">{order.dispatchInfo.shopName}</p>
              </div>
              <div>
                <h4 className="font-medium">Transport License Plate</h4>
                <p className="text-muted-foreground">{order.dispatchInfo.transportLicensePlate}</p>
              </div>
              <div>
                <h4 className="font-medium">Contact Person</h4>
                <p className="text-muted-foreground">{order.dispatchInfo.contactPerson}</p>
              </div>
              <div>
                <h4 className="font-medium">Dispatch Date</h4>
                <p className="text-muted-foreground">{order.dispatchInfo.dispatchDate}</p>
              </div>
              {order.dispatchInfo.driverName && (
                <div>
                  <h4 className="font-medium">Driver Name</h4>
                  <p className="text-muted-foreground">{order.dispatchInfo.driverName}</p>
                </div>
              )}
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Notification:</span> Dispatch information has been sent to both the shop and factory.
              </p>
            </div>
          </div>
        )}
        
        {/* Inventory Update Information */}
        {(order.status === 'Paid' || order.status === 'Dispatched' || order.status === 'Delivered') && (
          <div className="mt-6 pr-6">
            <h3 className="font-semibold text-lg mb-2">Inventory Update</h3>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-800">
                <span className="font-medium">Status:</span> Inventory has been updated. 
                {order.status === 'Paid' && ' Shop inventory increased and factory stock reduced when payment was confirmed.'}
                {order.status === 'Dispatched' && ' Shop inventory increased and factory stock reduced when payment was confirmed.'}
                {order.status === 'Delivered' && ' Shop inventory increased and factory stock reduced when payment was confirmed.'}
              </p>
            </div>
          </div>
        )}
        
        {/* Delivery Information */}
        {order.deliveryDate && (
          <div className="mt-6 pr-6">
            <h3 className="font-semibold text-lg mb-2">Delivery Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Delivery Date</h4>
                <p className="text-muted-foreground">{order.deliveryDate}</p>
              </div>
              {order.isClosed && (
                <div>
                  <h4 className="font-medium">Order Status</h4>
                  <p className="text-muted-foreground">Closed</p>
                </div>
              )}
              {order.feedback && (
                <div className="md:col-span-2">
                  <h4 className="font-medium">Feedback</h4>
                  <p className="text-muted-foreground">{order.feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}