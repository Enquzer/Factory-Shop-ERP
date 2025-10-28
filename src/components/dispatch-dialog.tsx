import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/orders";

interface DispatchDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDispatch: (dispatchInfo: any) => void;
}

export function DispatchDialog({ order, open, onOpenChange, onDispatch }: DispatchDialogProps) {
  const [driverName, setDriverName] = useState("");
  const [transportLicensePlate, setTransportLicensePlate] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setIsSubmitting(true);
    
    try {
      const dispatchInfo = {
        shopName: order.shopName,
        transportLicensePlate,
        contactPerson,
        dispatchDate,
        driverName,
        // In a real implementation, you would handle file uploads here
        // For now, we'll just pass the attachments array
        attachments: attachments.map(file => file.name)
      };

      await onDispatch(dispatchInfo);
      
      // Reset form
      setDriverName("");
      setTransportLicensePlate("");
      setContactPerson("");
      setDispatchDate(new Date().toISOString().split('T')[0]);
      setAttachments([]);
      
      toast({
        title: "Success",
        description: "Dispatch information added successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding dispatch information:", error);
      toast({
        title: "Error",
        description: "Failed to add dispatch information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dispatch Order</DialogTitle>
          <DialogDescription>
            Add dispatch information for order {order?.id}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input 
                id="orderNumber" 
                value={order?.id || ""} 
                readOnly 
                disabled 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input 
                id="shopName" 
                value={order?.shopName || ""} 
                readOnly 
                disabled 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input 
                id="driverName" 
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transportLicensePlate">Transport License Plate</Label>
              <Input 
                id="transportLicensePlate" 
                value={transportLicensePlate}
                onChange={(e) => setTransportLicensePlate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input 
                id="contactPerson" 
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dispatchDate">Dispatch Date</Label>
              <Input 
                id="dispatchDate" 
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Order Items</Label>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Product</th>
                    <th className="text-left p-3 text-sm font-medium">Variant</th>
                    <th className="text-left p-3 text-sm font-medium">Quantity</th>
                    <th className="text-left p-3 text-sm font-medium">Price</th>
                    <th className="text-left p-3 text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order?.items.map((item, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-10 h-10 object-contain rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-product.png';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <span className="text-xs">No Image</span>
                            </div>
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {item.variant.color}, {item.variant.size}
                      </td>
                      <td className="p-3 text-sm">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-sm">
                        ETB {item.price.toLocaleString()}
                      </td>
                      <td className="p-3 text-sm font-medium">
                        ETB {(item.price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (Optional)</Label>
            <Input 
              id="attachments" 
              type="file" 
              multiple 
              onChange={handleAttachmentChange}
              accept="image/*,.pdf,.doc,.docx"
            />
            {attachments.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-2">Attached files:</p>
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Dispatch Information"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}