import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Order } from "@/lib/orders";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Image from "next/image";
import { OrderStatusFlow } from "@/components/order-status-flow";

interface OrderDetailDialogProps {
  order?: Order; // Make order optional
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  const handleDownloadPDF = () => {
    if (!order) return;
    
    try {
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = `/api/orders/${order.id}/pdf`;
      link.download = `shop-order-${order.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating PDF:", error);
      // In a real implementation, you would show a toast notification
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // Handle case where order is undefined
  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>No Order Selected</DialogTitle>
            <DialogDescription>
              No order data is available to display.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            No order data available.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details - {order.id}</DialogTitle>
          <DialogDescription>
            View detailed information about this order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end pr-6">
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
        
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
                            if (target.src !== `${window.location.origin}/placeholder-product.png`) {
                                target.src = '/placeholder-product.png';
                            }
                        }}
                        unoptimized={true}
                        priority={false} // Set to false for non-critical images
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
                  order.status === 'Payment Slip Attached' ? 'outline' :
                  order.status === 'Paid' ? 'outline' :
                  order.status === 'Dispatched' ? 'outline' :
                  order.status === 'Delivered' ? 'secondary' : 'destructive'
                }>
                  {order.status}
                </Badge>
              </div>
              <Separator className="my-2" />
              {/* Enhanced Order Summary */}
              <div className="pt-2">
                <h4 className="font-medium text-sm mb-1">Order Details:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unique Designs:</span>
                    <span className="font-medium">{new Set(order.items.map(item => item.productId)).size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-medium">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-medium">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
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
                  {order.paymentSlipUrl.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-muted/30">
                      <FileText className="h-16 w-16 text-primary mb-2" />
                      <p className="text-xs font-medium text-center mb-4">PDF Payment Slip</p>
                      <Button 
                        asChild 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                      >
                        <a 
                          href={order.paymentSlipUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          View PDF
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <Image 
                      src={order.paymentSlipUrl || '/placeholder-payment.png'} 
                      alt="Payment slip" 
                      width={300} 
                      height={200} 
                      className="w-full h-auto object-contain"
                      onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== `${window.location.origin}/placeholder-payment.png`) {
                              target.src = '/placeholder-payment.png';
                          }
                      }}
                      unoptimized={true}
                      priority={false} // Set to false for non-critical images
                    />
                  )}
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
              {/* Display attachments if any */}
              {order.dispatchInfo.attachments && order.dispatchInfo.attachments.length > 0 && (
                <div className="md:col-span-2">
                  <h4 className="font-medium">Attachments</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {order.dispatchInfo.attachments.map((attachment: string, index: number) => (
                      <div key={index} className="bg-muted px-3 py-1 rounded-full text-sm">
                        {attachment}
                      </div>
                    ))}
                  </div>
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
        
        {/* Delivery Performance Metrics */}
        {(order.requestedDeliveryDate || order.expectedReceiptDate || order.actualDispatchDate || order.confirmationDate) && (
          <div className="mt-6 pr-6">
            <h3 className="font-semibold text-lg mb-2">Delivery Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.requestedDeliveryDate && (
                <div>
                  <h4 className="font-medium">Requested Delivery Date</h4>
                  <p className="text-muted-foreground">{order.requestedDeliveryDate}</p>
                </div>
              )}
              {order.expectedReceiptDate && (
                <div>
                  <h4 className="font-medium">Expected Receipt Date</h4>
                  <p className="text-muted-foreground">{order.expectedReceiptDate}</p>
                </div>
              )}
              {order.actualDispatchDate && (
                <div>
                  <h4 className="font-medium">Actual Dispatch Date</h4>
                  <p className="text-muted-foreground">{order.actualDispatchDate}</p>
                </div>
              )}
              {order.confirmationDate && (
                <div>
                  <h4 className="font-medium">Confirmation Date</h4>
                  <p className="text-muted-foreground">{order.confirmationDate}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}